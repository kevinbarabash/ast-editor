let renderAST = require('./codegen.js').renderAST;

var prog = {
    type: "Program",
    body: [
        {
            type: "LineComment",
            content: "Single line comment"  // newlines are disallowed
        },
        {
            type: "BlockComment",
            content: "Block Comment\nLine 1\nLine 2"
        },
        {
            type: "VariableDeclaration",
            declarations: [{
                type: "VariableDeclarator",
                id: {
                    type: "Identifier",
                    name: "a"
                },
                init: {
                    type: "Placeholder"
                }
            }],
            kind: "let"
        },
        {
            type: "ForOfStatement",
            left: {
                type: "Identifier",
                name: "a"
            },
            right: {
                type: "ArrayExpression",
                elements: [
                    { type: "Literal", value: 1, raw: "1.0" },
                    { type: "Literal", value: 2, raw: "2." },
                    { type: "Literal", value: 3, raw: "3" },
                    { type: "Placeholder" }
                ]
            },
            body: {
                type: "BlockStatement",
                body: [
                    {
                        type: "ExpressionStatement",
                        expression: {
                            type: "AssignmentExpression",
                            left: {
                                type: "Identifier",
                                name: "b"
                            },
                            right: {
                                type: "Placeholder"
                            }
                        }
                    },
                    { type: "Blankline" },
                    {
                        type: "ReturnStatement",
                        argument: {
                            type: "Identifier",
                            name: "b"
                        }
                    }
                ]
            }
        }
    ]
};

var cursorNode = null;
var cursorParentNode = null;

function findNode(node, parent, line, column) {
    if (node.loc) {
        let { start, end } = node.loc;
        let cursorAfterStart = line > start.line ||
            (line === start.line && column >= start.column);
        let cursorBeforeEnd = line < end.line ||
            (line === end.line && column <= end.column);
        if (cursorAfterStart && cursorBeforeEnd) {
            cursorNode = node;
            cursorParentNode = parent;
            for (let key of Object.keys(node)) {
                if (key === "type") {
                    continue;
                }
                if (key === "loc") {
                    continue;
                }
                if (!node.hasOwnProperty(key)) {
                    continue;
                }
                let value = node[key];
                if (Array.isArray(value)) {
                    for (let child of value) {
                        findNode(child, node, line, column);
                    }
                }
                findNode(value, node, line, column);
            }
        }
    }
}

let session = editor.getSession();
session.setValue(renderAST(prog));
session.on("change", e => {
    console.log(e);
});


let hideCursor = function() {
    document.querySelector('.ace_cursor-layer').style.opacity = 0.0;
};

let showCursor = function() {
    document.querySelector('.ace_cursor-layer').style.opacity = 1.0;
};


let selection = session.getSelection();
selection.on("changeCursor", e => {
    console.log(e);
    let range = editor.getSelectionRange();
    let line = range.start.row + 1;
    let column = range.start.column;
    console.log(`cursor at line ${line} and column ${column}`);
    findNode(prog, null, line, column);
    if (cursorNode.type === "Placeholder") {
        let loc = cursorNode.loc;
        let row = loc.start.line - 1;
        console.log(`setting location to: ${loc}`);
        selection.setSelectionRange({
            start: {row, column: loc.start.column},
            end: {row, column: loc.end.column}
        });
        hideCursor();
    } else {
        showCursor();
    }
    console.log(cursorNode);
});

document.addEventListener('keydown', function (e) {

    // prevent backspace
    if (e.keyCode === 8) {
        e.stopPropagation();
        e.preventDefault();

        if (cursorNode) {
            let range = editor.getSelectionRange();
            let row = range.end.row;
            let column = range.end.column;
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
                        column -= 3;    // ", ?".length
                        selection.setSelectionRange({
                            start: {row, column},
                            end: {row, column}
                        });
                    }
                }
                // TODO: if the parent is an array, remove this node
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
                cursorNode = null;

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
                cursorNode = null;

                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
            }
        }
    }
    // TODO: add the ability to insert lines correctly

    if (e.keyCode === 37) {
        console.log("left");
        e.preventDefault();
        e.stopPropagation();

        let { row, column } = selection.getCursor();
        let line = row + 1;
        console.log("line = ${line}, column = ${column}");
        findNode(prog, null, line, column);
        if ((cursorNode.type === "Literal" || cursorNode.type === "Identifier") &&
            cursorNode.loc.start.column <= column - 1) {
            column -= 1;
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

        let { row, column } = selection.getCursor();
        let line = row + 1;
        findNode(prog, null, line, column);
        if ((cursorNode.type === "Literal" || cursorNode.type === "Identifier") &&
            column + 1 <= cursorNode.loc.end.column) {
            column += 1;
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

document.addEventListener('keypress', function (e) {
    //e.stopPropagation();
    e.preventDefault();
    //console.log("keypress: %o", e);
    if (cursorNode) {
        let range = editor.getSelectionRange();
        let row = range.end.row;
        let column = range.end.column;
        let c = String.fromCharCode(e.keyCode);

        if (cursorNode.type === "Placeholder") {
            if (/[0-9\.]/.test(c)) {
                cursorNode.type = "Literal";
                if (c === ".") {
                    cursorNode.raw = "0.";
                    cursorNode.value = 0;
                    column += 1;
                } else {
                    cursorNode.raw = c;
                    cursorNode.value = parseFloat(c);
                }
            } else if (/[a-zA-Z_$]/.test(c)) {
                cursorNode.type = "Identifier";
                cursorNode.name = c;
            }
            session.setValue(renderAST(prog));
            cursorNode = null;
            selection.setSelectionRange({
                start: {row, column},
                end: {row, column}
            });
        } else if (cursorNode.type === "Literal") {
            if (/[0-9\.]/.test(c)) {
                let str = cursorNode.raw;
                if (c === "." && str.indexOf(".") !== -1) {
                    return;
                }
                let relIdx = column - cursorNode.loc.start.column;
                str = str.substring(0,relIdx) + c + str.substring(relIdx);
                cursorNode.raw = str;
                cursorNode.value = parseFloat(str);
                session.setValue(renderAST(prog));
                cursorNode = null;
                column += 1;
                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
                return;
            }
        } else if (cursorNode.type === "Identifier") {
            if (/[a-zA-Z_$0-9]/.test(c)) {
                // TODO: extract insert method
                let str = cursorNode.name;
                let relIdx = column - cursorNode.loc.start.column;
                str = str.substring(0,relIdx) + c + str.substring(relIdx);
                cursorNode.name = str;
                session.setValue(renderAST(prog));
                cursorNode = null;
                column += 1;
                selection.setSelectionRange({
                    start: {row, column},
                    end: {row, column}
                });
                return;
            }
        } else if (cursorNode.type === "LineComment") {
            let str = cursorNode.content;
            let relIdx = column - cursorNode.loc.start.column - 3;  // compensate for "// " prefix
            str = str.substring(0,relIdx) + c + str.substring(relIdx);
            cursorNode.content = str;
            session.setValue(renderAST(prog));
            cursorNode = null;
            column += 1;
            selection.setSelectionRange({
                start: {row, column},
                end: {row, column}
            });
            return;
        }

        if (cursorParentNode && cursorParentNode.type === "ArrayExpression") {
            if (c === ",") {
                let idx = -1;
                let elements = cursorParentNode.elements;

                elements.forEach((element, index) => {
                    if (cursorNode === element) {
                        idx = index;
                    }
                });
                if (idx !== -1) {
                    let node = {
                        type: "Placeholder"
                    };
                    elements.splice(idx + 1, 0, node);
                    session.setValue(renderAST(prog));
                    column += 3;    // ", ?".length
                    selection.setSelectionRange({
                        start: {row, column},
                        end: {row, column}
                    });
                }
            }
        }
    }

}, true);

document.addEventListener('keyup', function (e) {

    // prevent backspace
    if (e.keyCode === 8) {
        e.stopPropagation();
        e.preventDefault();
    }

    //console.log("keyup: %o", e);
}, true);

// TODO: dragging to create a selection should always select nodes that make sense to replace or delete
// TODO: delete => replace with Placeholder
// TODO: figure out undo/redo on the AST
// TODO: certain nodes can be edited, e.g. Literals, Identifiers... other nodes can not
// TODO: select the whole node when it can't be edited when placing the cursor somewhere
// TODO: handle replacing the current selection
// TODO: undo/redo using either ast-path to identify nodes or use references for children in the AST
