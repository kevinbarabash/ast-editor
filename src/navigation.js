let renderAST = require('./codegen.js').renderAST;
let { findNode, findPropName, findNodePath } = require("./node_utils.js");
let prog = require("./prog.js");

let clearProps = function (node) {
    Object.keys(node).forEach(key => {
        delete node[key];
    });
};

let copyProps = function (srcNode, dstNode) {
    Object.keys(srcNode).forEach(key => {
        dstNode[key] = srcNode[key];
    });
};

document.addEventListener('keydown', function (e) {
    let session = editor.getSession();
    let selection = session.getSelection();

    let range = editor.getSelectionRange();
    let row = range.end.row;
    let column = range.end.column;
    let line = row + 1;
    
    let { cursorNode, cursorParentNode, cursorStatementNode, cursorStatementParentNode } = findNode(prog, line, column);
    let path = findNodePath(prog, line, column);

    // prevent backspace
    if (e.keyCode === 8) {
        e.stopPropagation();
        e.preventDefault();

        if (cursorNode) {
            let relIdx = column - cursorNode.loc.start.column;

            if (cursorNode.type === "Placeholder") {
                if (cursorParentNode && cursorParentNode.type === "ArrayExpression") {
                    let idx = -1;
                    let elements = cursorParentNode.elements;

                    elements.forEach((element, index) => {
                        if (cursorNode === element) {
                            idx = index;
                        }
                    });
                    if (idx !== -1) {
                        elements.splice(idx, 1);
                        session.setValue(renderAST(prog));
                        if (elements.length > 0) {
                            column -= 3;    // ", ?".length
                        } else {
                            column -= 1;    // "?".length
                        }
                        selection.setSelectionRange({
                            start: {row, column},
                            end: {row, column}
                        });
                    }
                } else if (cursorParentNode.type === "ExpressionStatement") {
                    clearProps(cursorParentNode);
                    cursorParentNode.type = "BlankStatement";
                    session.setValue(renderAST(prog));
                    selection.setSelectionRange({
                        start: {row, column},
                        end: {row, column}
                    });
                } else {
                    // TODO: find the path instead of just finding the cursor
                    let node2 = path[path.length - 2];

                    if (node2.type === "BinaryExpression") {
                        let left = node2.left;
                        clearProps(node2);
                        node2.type = left.type;
                        copyProps(left, node2);
                        column -= 4;

                        session.setValue(renderAST(prog));
                        selection.setSelectionRange({
                            start: {row, column},
                            end: {row, column}
                        });
                    } else if (node2.type === "AssignmentExpression") {
                        let left = node2.left;
                        clearProps(node2);
                        node2.type = left.type;
                        copyProps(left, node2);
                        column -= 4;

                        session.setValue(renderAST(prog));
                        selection.setSelectionRange({
                            start: {row, column},
                            end: {row, column}
                        });
                    } else if (node2.type === "Parentheses") {
                        clearProps(node2);
                        node2.type = "Placeholder";
                        column -= 1;

                        session.setValue(renderAST(prog));
                        selection.setSelectionRange({
                            start: {row, column},
                            end: {row, column}
                        });
                    }
                    console.log(path);
                }
                // TODO: if the parent is an array, remove this node
            } else if (cursorNode.type === "ArrayExpression" && cursorNode.elements.length === 0) {
                clearProps(cursorNode);
                cursorNode.type = "Placeholder";
                session.setValue(renderAST(prog));
                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
            } else if (cursorNode.type === "Literal") {
                let str = cursorNode.raw;
                if (str.length === 1) {
                    delete cursorNode.value;
                    cursorNode.type = "Placeholder";
                } else {
                    str = str.substring(0, relIdx - 1) + str.substring(relIdx);
                    cursorNode.raw = str;
                    cursorNode.value = parseFloat(str);
                    column -= 1;
                }
                session.setValue(renderAST(prog));
                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
            } else if (cursorNode.type === "Identifier") {
                let str = String(cursorNode.name);
                if (str.length === 1) {
                    delete cursorNode.name;
                    cursorNode.type = "Placeholder";
                } else {
                    str = str.substring(0, relIdx - 1) + str.substring(relIdx);
                    cursorNode.name = str;
                    column -= 1;
                }
                session.setValue(renderAST(prog));
                cursorNode = null;

                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
            } else if (cursorNode.type === "LineComment") {
                // TODO: figure out how to delete LineCommments
                relIdx -= 3;  // compensate for "// " prefix
                let str = String(cursorNode.content);
                if (str.length > 0) {
                    str = str.substring(0, relIdx - 1) + str.substring(relIdx);
                    cursorNode.content = str;
                    column -= 1;
                }
                session.setValue(renderAST(prog));
                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
            } else if (cursorNode.type === "BlankStatement") {
                let idx = -1;
                let elements = cursorParentNode.body;

                elements.forEach((element, index) => {
                    if (cursorNode === element) {
                        idx = index;
                    }
                });
                if (idx !== -1) {
                    elements.splice(idx, 1);
                    session.setValue(renderAST(prog));

                    row -= 1;
                    column = cursorStatementParentNode.loc.start.column;
                    
                    selection.setSelectionRange({
                        start: {row, column},
                        end: {row, column}
                    });
                }
            }
        }
    }
    
    if (e.keyCode === 13) {
        
        console.log(cursorStatementNode);
        if (cursorNode.type === "BlankStatement") {
            let elements = cursorParentNode.body;
            let idx = -1;
            elements.forEach((element, index) => {
                if (cursorNode === element) {
                    idx = index;
                }
            });
            let node = {
                type: "BlankStatement"
            };
            elements.splice(idx + 1, 0, node);
            row += 1;
            column = cursorParentNode.loc.start.column;
            session.setValue(renderAST(prog));
            selection.setSelectionRange({
                start: {row, column},
                end: {row, column}
            });
        } else {
            let elements = cursorStatementParentNode.body;
            let idx = -1;
            elements.forEach((element, index) => {
                if (cursorStatementNode === element) {
                    idx = index;
                }
            });
            let node = {
                type: "BlankStatement"
            };
            elements.splice(idx + 1, 0, node);
            row += 1;
            column = cursorStatementParentNode.loc.start.column;
            session.setValue(renderAST(prog));
            console.log(`row = ${row}, column = ${column}`);
            selection.setSelectionRange({
                start: {row, column},
                end: {row, column}
            });
        }
    }
    // TODO: add the ability to insert lines correctly

    if (e.keyCode === 37) {
        console.log("left");
        e.preventDefault();
        e.stopPropagation();

        if (["Literal", "Identifier"].indexOf(cursorNode.type) !== -1) {
            if (cursorNode.loc.start.column <= column - 1) {
                column -= 1;
                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
            } else {
                let propName = findPropName(cursorParentNode, cursorNode);
                if (propName === "left") {
                    let node = path[path.length - 3];   // grandparent
                    let loc = node.left.loc;
                    let row = loc.end.line - 1;
                    let column = loc.end.column + 1;
                    selection.setSelectionRange({
                        start: {
                            row: row,
                            column: column
                        },
                        end: {
                            row: row,
                            column: column + 1
                        }
                    });
                    hideCursor();
                } else if (propName === "right") {
                    // TODO: dry this code out, see editor's on cursorChange handler
                    let loc = cursorParentNode.left.loc;
                    let row = loc.end.line - 1;
                    let column = loc.end.column + 1;
                    selection.setSelectionRange({
                        start: {
                            row: row,
                            column: column
                        },
                        end: {
                            row: row,
                            column: column + 1
                        }
                    });
                    hideCursor();
                }
            }
        } else if (["BinaryExpression", "AssignmentExpression"].indexOf(cursorNode.type) !== -1) {
            column = cursorNode.left.loc.end.column;
            selection.setSelectionRange({
                start: {row, column},
                end: {row, column}
            });
        } else {
            if (cursorParentNode.type === "ArrayExpression") {
                let elements = cursorParentNode.elements;
                let idx = -1;
                elements.forEach((element, index) => {
                    if (cursorNode === element) {
                        idx = index;
                    }
                });
                if (idx > 0) {
                    cursorNode = cursorParentNode.elements[idx - 1];
                    column = cursorNode.loc.end.column; // assume same row
                    selection.setSelectionRange({
                        start: {row, column},
                        end: {row, column}
                    });
                }
            }
        }
    }

    if (e.keyCode === 39) {
        console.log("right");
        e.preventDefault();
        e.stopPropagation();

        if (cursorNode.type === "Literal" || cursorNode.type === "Identifier") {
            if (column + 1 <= cursorNode.loc.end.column) {
                column += 1;
                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
            } else {
                let propName = findPropName(cursorParentNode, cursorNode);
                if (propName === "left") {
                    // TODO: dry this code out, see editor's on cursorChange handler
                    let loc = cursorParentNode.left.loc;
                    let row = loc.end.line - 1;
                    let column = loc.end.column + 1;
                    selection.setSelectionRange({
                        start: {
                            row: row,
                            column: column
                        },
                        end: {
                            row: row,
                            column: column + 1
                        }
                    });
                    hideCursor();
                } else if (propName === "right") {
                    let node = path[path.length - 3];   // grandparent
                    let loc = node.left.loc;
                    let row = loc.end.line - 1;
                    let column = loc.end.column + 1;
                    selection.setSelectionRange({
                        start: {
                            row: row,
                            column: column
                        },
                        end: {
                            row: row,
                            column: column + 1
                        }
                    });
                    hideCursor();
                }
            }
        } else if (["BinaryExpression", "AssignmentExpression"].indexOf(cursorNode.type) !== -1) {
            column = cursorNode.right.loc.start.column;
            selection.setSelectionRange({
                start: {row, column},
                end: {row, column}
            });
        } else {
            if (cursorParentNode.type === "ArrayExpression") {
                let elements = cursorParentNode.elements;
                let idx = -1;
                elements.forEach((element, index) => {
                    if (cursorNode === element) {
                        idx = index;
                    }
                });
                if (idx < elements.length - 1) {
                    cursorNode = cursorParentNode.elements[idx + 1];
                    column = cursorNode.loc.start.column; // assume same row
                    selection.setSelectionRange({
                        start: {row, column},
                        end: {row, column}
                    });
                }
            }
        }
    }

    //console.log("keydown: %o", e);
}, true);
