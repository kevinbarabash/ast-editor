var indent = "    ";
var line, column, indentLevel;

function renderAST(node) {
    line = 1;
    column = 0;
    indentLevel = 0;
    return render(node);
}

function render(node) {
    if (node.type === "VariableDeclaration") {
        node.loc = {};
        node.loc.start = { line, column };
        let result = node.kind;
        result += " ";
        column += node.kind.length + 1;     // node.kind.length + " ".length

        node.declarations.forEach((decl, index) => {
            if (index > 0) {
                result += ", ";
                column += 2;    // ", ".length
            }
            result += render(decl);
        });

        node.loc.end = { line, column };
        return result + ";";
    } else if (node.type === "VariableDeclarator") {
        if (node.init) {
            node.loc = {};
            let result = render(node.id);
            node.loc.start = node.id.loc.start;
            result += " = ";
            column += 3;    // " = ".length
            result += render(node.init);
            node.loc.end = node.init.loc.end;
            return result;
        } else {
            let result = render(node.id);
            node.loc = node.id.loc;
            return result;
        }
    } else if (node.type === "Identifier") {
        node.loc = {};
        node.loc.start = { line, column };
        column += node.name.length;
        node.loc.end = { line, column };
        return node.name;
    } else if (node.type === "Placeholder") {
        node.loc = {};
        node.loc.start = { line, column };
        column += 1;    // "?".length
        node.loc.end = { line, column };
        return "?";
    } else if (node.type === "Blankline") {
        return "";
    } else if (node.type === "ForOfStatement") {
        node.loc = {};
        node.loc.start = { line, column };

        let result = "for (";
        column += 5;    // "for (".length

        result += render(node.left);
        result += " of ";
        column += 4;    // " of ".length
        result += render(node.right);
        result += ") {\n";

        indentLevel += 1;
        column += indentLevel * indent.length;
        line += 1;
        result += render(node.body);
        indentLevel -= 1;

        result += indent.repeat(indentLevel) + "}";

        node.loc.end = { line, column };

        return result;
    } else if (node.type === "ArrayExpression") {
        node.loc = {};
        node.loc.start = { line, column };

        let result = "[";
        column += 1;

        node.elements.forEach((element, index) => {
            if (index > 0) {
                result += ", ";
                column += 2;    // ", ".length
            }
            result += render(element);
        });

        result += "]";
        column += 1;

        node.loc.end = { line, column };

        return result;
    } else if (node.type === "Literal") {
        node.loc = {};
        node.loc.start = { line, column };
        column += String(node.value).length;
        node.loc.end = { line, column };

        return node.value;
    } else if (node.type === "BlockStatement") {
        let children = node.body.map(statement => {
            column = indentLevel * indent.length;
            let result = indent.repeat(indentLevel) + render(statement);
            line += 1;
            return result;
        });

        // TODO guarantee that there's always one child
        let first = node.body[0];
        let last = node.body[children.length - 1];

        node.loc = {};
        node.loc.start = first.loc.start;
        node.loc.end = last.loc.end;

        return children.join("\n") + "\n";
    } else if (node.type === "ExpressionStatement") {
        let expr = render(node.expression);

        node.loc = {
            start: node.expression.loc.start,
            end: node.expression.loc.end
        };

        return expr + ";";
    } else if (node.type === "AssignmentExpression") {
        let left = render(node.left);
        column += 3;    // " = ".length;
        let right = render(node.right);

        node.loc = {
            start: node.left.loc.start,
            end: node.right.loc.end
        };

        return `${left} = ${right}`;
    } else if (node.type === "ReturnStatement") {
        node.loc = {};
        node.loc.start = { line, column };

        column += 7;    // "return ".length
        let arg = render(node.argument);

        node.loc.end = node.argument.loc.end;

        return `return ${arg};`;
    } else if (node.type === "Program") {
        // TODO: unify this with "BlockStatement" which has the same code
        node.loc = {};
        node.loc.start = { line, column };
        let result = node.body.map(statement => {
            column = indentLevel * indent.length;
            let result = indent.repeat(indentLevel) + render(statement);
            line += 1;
            return result;
        }).join("\n") + "\n";
        node.loc.end = { line, column };
        return result;
    } else if (node.type === "LineComment") {
        node.loc = {};
        node.loc.start = { line, column };
        let result = "// " + node.content;
        column += result.length;
        node.loc.end = { line, column };
        return result;
    } else if (node.type === "BlockComment") {
        // TODO: handle indent level
        node.loc = {};
        column = indent.length * indentLevel;
        node.loc.start = { line, column };
        let lines = node.content.split("\n");
        let result = "/*\n" + lines.map(line => "  " + line + "\n").join("") + " */";
        line += 1 + lines.length;   // Program or BlockStatements add another \n
        column = indent.length * indentLevel;
        node.loc.end = { line, column };
        return result;
    }
}


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
                    { type: "Literal", value: 1 },
                    { type: "Literal", value: 2 },
                    { type: "Literal", value: 3 },
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
                let str = String(cursorNode.value);
                if (str.length === 1) {
                    delete cursorNode.value;
                    cursorNode.type = "Placeholder";
                } else {
                    str = str.substring(0, relIdx - 1) + str.substring(relIdx);
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
    }
    
    if (e.keyCode === 39) {
        console.log("right");
        e.preventDefault();
        e.stopPropagation();
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
            if (/[0-9]/.test(c)) {
                cursorNode.type = "Literal";
                cursorNode.value = String.fromCharCode(e.keyCode);
            } else if (/[a-zA-Z_$]/.test(c)) {
                cursorNode.type = "Identifier";
                cursorNode.name = String.fromCharCode(e.keyCode);
            }
            session.setValue(renderAST(prog));
            cursorNode = null;
            selection.setSelectionRange({
                start: {row, column},
                end: {row, column}
            });
        } else if (cursorNode.type === "Literal") {
            if (/[0-9]/.test(c)) {
                let str = String(cursorNode.value);
                let relIdx = column - cursorNode.loc.start.column;
                str = str.substring(0,relIdx) + c + str.substring(relIdx);
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
