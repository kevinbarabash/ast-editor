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

let hideCursor = function() {
    document.querySelector('.ace_cursor-layer').style.opacity = 0.0;
};

let showCursor = function() {
    document.querySelector('.ace_cursor-layer').style.opacity = 1.0;
};

let selection = editor.getSession().getSelection();
let session = editor.getSession();

let update = function(row, column) {
    session.setValue(renderAST(prog));
    selection.setSelectionRange({
        start: { row, column },
        end: { row, column }
    });
};


selection.on("changeCursor", e => {
    let range = editor.getSelectionRange();
    let line = range.start.row + 1;
    let column = range.start.column;
    let { cursorNode } = findNode(prog, line, column);
    console.log(cursorNode);
    if (cursorNode.type === "Placeholder") {
        let loc = cursorNode.loc;
        let row = loc.start.line - 1;
        selection.setSelectionRange({
            start: {row, column: loc.start.column},
            end: {row, column: loc.end.column}
        });
        hideCursor();
    } else if (["AssignmentExpression", "BinaryExpression"].indexOf(cursorNode.type) !== -1) {
        let loc = cursorNode.left.loc;
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
    } else {
        showCursor();
    }
});

document.addEventListener('keydown', function (e) {
    let range = editor.getSelectionRange();
    let row = range.end.row;
    let column = range.end.column;
    let line = row + 1;
    
    let path = findNodePath(prog, line, column);

    // ignore tabs
    if (e.keyCode === 9) {
        e.stopPropagation();
        e.preventDefault();
    }
    
    if (e.keyCode === 8) {
        e.stopPropagation();
        e.preventDefault();
        backspace(path, row, column);
    }
    
    if (e.keyCode === 13) {
        e.stopPropagation();
        e.preventDefault();
        enter(path, row, column);
    }
    // TODO: add the ability to insert lines correctly

    if (e.keyCode === 37) {
        e.preventDefault();
        e.stopPropagation();
        left(path, row, column);
    }

    if (e.keyCode === 39) {
        console.log("right");
        e.preventDefault();
        e.stopPropagation();
        right(path, row, column);
    }
}, true);

let backspace = function(path, row, column) {
    let { cursorStatementParentNode } = findNode(prog, row + 1, column);
    
    let node1 = path[path.length - 1];
    let node2 = path[path.length - 2];

    if (!node1) {
        return;
    }

    let relIdx = column - node1.loc.start.column;


    if (node1.type === "Placeholder") {
        if (node2.type === "ArrayExpression") {
            let elements = node2.elements;
            let idx = elements.findIndex(element => node1 === element);

            if (idx === -1) return;

            elements.splice(idx, 1);
            if (elements.length > 0) {
                column -= 3;    // ", ?".length
            } else {
                column -= 1;    // "?".length
            }
            update(row, column);
        } else if (node2.type === "FunctionExpression") {
            let params = node2.params;
            let idx = params.findIndex(param => node1 === param);

            if (idx === -1) return;
            
            params.splice(idx, 1);
            if (params.length > 0) {
                column -= 3;    // ", ?".length
            } else {
                column -= 1;    // "?".length
            }
            update(row, column);
        } else if (node2.type === "ExpressionStatement") {
            clearProps(node2);
            node2.type = "BlankStatement";
            update(row, column);
        } else if (node2.type === "BinaryExpression") {
            let left = node2.left;
            clearProps(node2);
            node2.type = left.type;
            copyProps(left, node2);
            column -= 4;
            update(row, column);
        } else if (node2.type === "AssignmentExpression") {
            let left = node2.left;
            clearProps(node2);
            node2.type = left.type;
            copyProps(left, node2);
            column -= 4;
            update(row, column);
        } else if (node2.type === "Parentheses") {
            clearProps(node2);
            node2.type = "Placeholder";
            column -= 1;
            update(row, column);
        } else if (node2.type === "MethodDefinition") {
            clearProps(node2);
            node2.type = "BlankStatement";
            column -= 1;    // "?".length
            update(row, column);
        } else if (node2.type === "ReturnStatement") {
            clearProps(node2);
            node2.type = "BlankStatement";
            column -= 8;    // "return ?".length
            update(row, column);
        }
        console.log(path);
    } else if (node1.type === "ArrayExpression" && node1.elements.length === 0) {
        clearProps(node1);
        node1.type = "Placeholder";
        update(row, column);
    } else if (node1.type === "Literal") {
        let str = node1.raw;
        if (str.length === 1) {
            delete node1.value;
            node1.type = "Placeholder";
        } else {
            str = str.substring(0, relIdx - 1) + str.substring(relIdx);
            node1.raw = str;
            node1.value = parseFloat(str);
            column -= 1;
        }
        update(row, column);
    } else if (node1.type === "Identifier") {
        let str = String(node1.name);
        if (str.length === 1) {
            delete node1.name;
            node1.type = "Placeholder";
            if (node2.type === "VariableDeclarator") {
                if (findPropName(node2, node1) === "id") {
                    node1.accept = "Identifier";
                }
            }
            if (node2.type === "FunctionExpression") {
                if (node2.params.findIndex(param => param === node1) !== -1) {
                    node1.accept = "Identifier";
                }
            }
        } else {
            str = str.substring(0, relIdx - 1) + str.substring(relIdx);
            node1.name = str;
            column -= 1;
        }
        update(row, column);
    } else if (node1.type === "LineComment") {
        // TODO: figure out how to delete LineCommments
        relIdx -= 3;  // compensate for "// " prefix
        let str = String(node1.content);
        if (str.length > 0) {
            str = str.substring(0, relIdx - 1) + str.substring(relIdx);
            node1.content = str;
            column -= 1;
        }
        update(row, column);
    } else if (node1.type === "BlankStatement") {
        let elements = node2.body;
        let idx = elements.findIndex(element => node1 === element);

        if (idx !== -1) {
            elements.splice(idx, 1);

            row -= 1;
            column = cursorStatementParentNode.loc.start.column;

            update(row, column);
        }
    }
};

let enter = function(path, row, column) {
    let { cursorNode, cursorParentNode, cursorStatementNode, cursorStatementParentNode } = findNode(prog, row + 1, column);

    console.log(cursorStatementNode);
    if (cursorNode.type === "BlankStatement") {
        let elements = cursorParentNode.body;
        let idx = elements.findIndex(element => cursorNode === element);

        elements.splice(idx + 1, 0, {type: "BlankStatement"});
        row += 1;
        column = cursorParentNode.loc.start.column;
        update(row, column);
    } else if (cursorParentNode.type === "MethodDefinition") {
        let classBody = path[path.length - 3];
        let body = classBody.body;
        // we use the cursorParentNode here because that's the MethodDefinition
        // we're in, not the FunctionExpression which is the cursorNode
        let idx = body.findIndex(node => node === cursorParentNode);
        if (idx !== -1) {
            body.splice(idx + 1, 0, { type: "BlankStatement" });
            row += 1;
            column = cursorParentNode.loc.start.column;
            update(row, column);
        }
    } else {
        let elements = cursorStatementParentNode.body;
        let idx = elements.findIndex(element => cursorStatementNode === element);

        elements.splice(idx + 1, 0, { type: "BlankStatement" });
        row += 1;
        column = cursorStatementParentNode.loc.start.column;
        update(row, column);
    }
};

let left = function(path, row, column) {
    let { cursorNode, cursorParentNode } = findNode(prog, row + 1, column);

    if (["Literal", "Identifier"].indexOf(cursorNode.type) !== -1) {
        if (cursorNode.loc.start.column <= column - 1) {
            column -= 1;
            selection.setSelectionRange({
                start: {row, column},
                end: {row, column}
            });
        } else {
            if (cursorParentNode.type === "ArrayExpression") {
                let elements = cursorParentNode.elements;
                let idx = elements.findIndex(element => cursorNode === element);

                if (idx > 0) {
                    cursorNode = cursorParentNode.elements[idx - 1];
                    column = cursorNode.loc.end.column; // assume same row
                    selection.setSelectionRange({
                        start: {row, column},
                        end: {row, column}
                    });
                }

                return;
            }
            for (let i = path.length - 1; i > 0; i--) {
                let node = path[i];
                let parent = path[i - 1];

                let propName = findPropName(parent, node);

                if (propName === "right") {
                    let loc = parent.left.loc;
                    row = loc.end.line - 1;
                    column = loc.end.column + 1;
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
                    break;
                } else if (propName === "init") {
                    // TODO: check the type, if it's a placeholder then we need to select it
                    let loc = parent.id.loc;
                    row = loc.end.line - 1;
                    column = loc.end.column;
                    selection.setSelectionRange({
                        start: {row, column},
                        end: {row, column}
                    });
                    break;
                }
            }
        }
    } else if (cursorNode.type === "Placeholder") {
        if (cursorParentNode.type === "ArrayExpression") {
            let elements = cursorParentNode.elements;
            let idx = elements.findIndex(element => cursorNode === element);

            if (idx > 0) {
                cursorNode = cursorParentNode.elements[idx - 1];
                column = cursorNode.loc.end.column; // assume same row
                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
            }

            return;
        }
        for (let i = path.length - 1; i > 0; i--) {
            let node = path[i];
            let parent = path[i - 1];

            let propName = findPropName(parent, node);

            if (propName === "right") {
                let loc = parent.left.loc;
                row = loc.end.line - 1;
                column = loc.end.column + 1;
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
                break;
            } else if (propName === "init") {
                // TODO: check the type, if it's a placeholder then we need to select it
                let loc = parent.id.loc;
                row = loc.end.line - 1;
                column = loc.end.column;
                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
                break;
            }
        }
    } else if (["BinaryExpression", "AssignmentExpression"].indexOf(cursorNode.type) !== -1) {
        column = cursorNode.left.loc.end.column;
        selection.setSelectionRange({
            start: {row, column},
            end: {row, column}
        });
    } else {

    }
};

let right = function(path, row, column) {
    let { cursorNode, cursorParentNode } = findNode(prog, row + 1, column);

    if (["Literal", "Identifier"].indexOf(cursorNode.type) !== -1) {
        if (column + 1 <= cursorNode.loc.end.column) {
            column += 1;
            selection.setSelectionRange({
                start: {row, column},
                end: {row, column}
            });
        } else {
            if (cursorParentNode.type === "ArrayExpression") {
                let elements = cursorParentNode.elements;
                let idx = elements.findIndex(element => cursorNode === element);

                if (idx < elements.length - 1) {
                    cursorNode = cursorParentNode.elements[idx + 1];
                    column = cursorNode.loc.start.column; // assume same row
                    selection.setSelectionRange({
                        start: {row, column},
                        end: {row, column}
                    });
                }
                return;
            }
            for (let i = path.length - 1; i > 0; i--) {
                let node = path[i];
                let parent = path[i-1];

                let propName = findPropName(parent, node);

                if (propName === "left") {
                    let loc = parent.left.loc;
                    row = loc.end.line - 1;
                    column = loc.end.column + 1;
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

                    break;
                } else if (propName === "id" && cursorParentNode.type === "VariableDeclarator") {
                    column += 3;
                    selection.setSelectionRange({
                        start: {
                            row: row,
                            column: column
                        },
                        end: {
                            row: row,
                            column: column
                        }
                    });
                    //hideCursor();
                    // TODO: check the type, e.g. PlaceHolder
                }
            }
        }
    } else if (cursorNode.type === "Placeholder") {
        if (cursorParentNode.type === "ArrayExpression") {
            let elements = cursorParentNode.elements;
            let idx = elements.findIndex(element => cursorNode === element);

            if (idx < elements.length - 1) {
                cursorNode = cursorParentNode.elements[idx + 1];
                column = cursorNode.loc.start.column; // assume same row
                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
            }
            return;
        }
        for (let i = path.length - 1; i > 0; i--) {
            let node = path[i];
            let parent = path[i - 1];

            let propName = findPropName(parent, node);

            if (propName === "left") {
                let loc = parent.right.loc;
                row = loc.start.line - 1;
                column = loc.start.column - 1;
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
                break;
            } else if (propName === "init") {
                // TODO: check the type, if it's a placeholder then we need to select it
                let loc = parent.id.loc;
                row = loc.end.line - 1;
                column = loc.end.column;
                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
                break;
            }
        }
    } else if (["BinaryExpression", "AssignmentExpression"].indexOf(cursorNode.type) !== -1) {
        column = cursorNode.right.loc.start.column;
        selection.setSelectionRange({
            start: {row, column},
            end: {row, column}
        });
    }
};
