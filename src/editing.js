let session, selection, editor, prog;

let renderAST = require('./codegen.js').renderAST;
let { findNode, findPropName, findNodePath } = require("./node_utils.js");

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

let update = function(row, column) {
    session.setValue(renderAST(prog));
    selection.setSelectionRange({
        start: { row, column },
        end: { row, column }
    });
};

document.addEventListener('keypress', function (e) {
    e.preventDefault();

    let range = editor.getSelectionRange();
    let row = range.end.row;
    let column = range.end.column;
    let line = row + 1;

    let { cursorNode, cursorParentNode } = findNode(prog, line, column);

    if (!cursorNode) {
        return;
    }

    let c = String.fromCharCode(e.keyCode);

    insert(c, cursorNode, cursorParentNode, row, column);

}, true);

document.addEventListener('keyup', function (e) {
    // prevent backspace
    if (e.keyCode === 8) {
        e.stopPropagation();
        e.preventDefault();
    }
}, true);

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
}, true);

let insert = function(c, cursorNode, cursorParentNode, row, column) {
    let line = row + 1;

    if (c === ",") {
        let path = findNodePath(prog, line, column);
        let expression = null;
        let parent = null;
        // find the largest expression such that the cursor as the end of it
        for (let i = path.length - 1; i > -1; i--) {
            let node = path[i];
            if (node.loc.end.column === column) {
                expression = node;
                parent = path[i - 1];
            }
        }
        if (expression && parent && parent.type === "ArrayExpression") {
            let elements = parent.elements;
            let idx = elements.findIndex(element => expression === element);

            if (idx !== -1) {
                let node = {
                    type: "Placeholder"
                };
                elements.splice(idx + 1, 0, node);
                column += 3;    // ", ?".length

                update(row, column);
            }
        }
        if (expression && parent && parent.type === "FunctionExpression") {
            let params = parent.params;
            let idx = params.findIndex(param => expression === param);

            if (idx !== -1) {
                let node = {
                    type: "Placeholder",
                    accept: "Identifier"
                };
                params.splice(idx + 1, 0, node);
                column += 3;    // ", ?".length

                update(row, column);
            }
        }
        if (expression && parent && parent.type === "CallExpression") {
            let args = parent.arguments;
            let idx = args.findIndex(param => expression === param);

            if (idx !== -1) {
                let node = {
                    type: "Placeholder"
                };
                args.splice(idx + 1, 0, node);
                column += 3;    // ", ?".length

                update(row, column);
            }
        }
    } else if (cursorNode.type === "ArrayExpression" && cursorNode.elements.length === 0) {
        let node = null;
        if (/[0-9\.]/.test(c)) {
            node = {
                type: "Literal"
            };
            if (c === ".") {
                node.raw = "0.";
                column += 1;
            } else {
                node.raw = c;
            }
            column += 1;
        } else if (/[a-zA-Z_$]/.test(c)) {
            node = {
                type: "Identifier",
                name: c
            };
            column += 1;
        } else if (/[\(\)]/.test(c)) {
            node = {
                type: "Parentheses",
                expression: {
                    type: "Placeholder"
                }
            };
            column += 1;
        }
        if (node !== null) {
            cursorNode.elements = [node];
            update(row, column);
        }
    } else if (cursorNode.type === "Placeholder") {
        if (/[0-9\.]/.test(c) && (!cursorNode.accept || cursorNode.accept === "Literal")) {
            cursorNode.type = "Literal";
            if (c === ".") {
                cursorNode.raw = "0.";
                column += 1;
            } else {
                cursorNode.raw = c;
            }
        } else if (/[a-zA-Z_$]/.test(c) && (!cursorNode.accept || cursorNode.accept === "Identifier")) {
            cursorNode.type = "Identifier";
            cursorNode.name = c;
        } else if (c === "(") {
            cursorNode.type = "Parentheses";
            cursorNode.expression = {
                type: "Placeholder"
            };
            column += 1;
        } else if (c === "[" && (!cursorNode.accept || cursorNode.accept === "ArrayExpression")) {
            clearProps(cursorNode);
            cursorNode.type = "ArrayExpression";
            cursorNode.elements = [];
        } else if (/[\+\-\*\/<>]/.test(c) && (!cursorNode.accept || cursorNode.accept === "BinaryExpression")) {
            if (cursorParentNode.type === "VariableDeclarator") {
                if (findPropName(cursorParentNode, cursorNode) === "id") {
                    return;
                }
            }
            if (cursorParentNode.type === "FunctionExpression") {
                if (cursorParentNode.params.findIndex(param => param === cursorNode) !== -1) {
                    return;
                }
            }
            let left = JSON.parse(JSON.stringify(cursorNode));
            cursorNode.type = "BinaryExpression";
            cursorNode.left = left;
            cursorNode.right = { type: "Placeholder" };
            cursorNode.operator = c;
            column += 3;
        }
        update(row, column);
    } else if (cursorNode.type === "Literal") {
        if (/[0-9\.]/.test(c)) {
            let str = cursorNode.raw;
            if (c === "." && str.indexOf(".") !== -1) {
                return; // can't have more than one decimal
            }
            let relIdx = column - cursorNode.loc.start.column;
            str = str.substring(0,relIdx) + c + str.substring(relIdx);
            cursorNode.raw = str;
            column += 1;

            update(row, column);
        } else if (/[\+\-\*\/<>]/.test(c)) {
            let left = JSON.parse(JSON.stringify(cursorNode));
            clearProps(cursorNode);
            cursorNode.type = "BinaryExpression";
            cursorNode.left = left;
            cursorNode.right = { type: "Placeholder" };
            cursorNode.operator = c;
            column += 3;
            update(row, column);
        }
    } else if (cursorNode.type === "Identifier") {
        if (/[a-zA-Z_$0-9]/.test(c)) {
            let str = cursorNode.name;
            let relIdx = column - cursorNode.loc.start.column;
            str = str.substring(0,relIdx) + c + str.substring(relIdx);
            cursorNode.name = str;
            column += 1;

            update(row, column);
        } else if (c === "=") {
            if (cursorParentNode.type === "ExpressionStatement") {
                cursorParentNode.expression = {
                    type: "AssignmentExpression",
                    left: cursorNode,
                    right: {
                        type: "Placeholder"
                    }
                };
                column += 3;
            } else if (cursorParentNode.type === "MemberExpression") {
                let path = findNodePath(prog, line, column);
                let node = null;
                // find the largest expression with the cursor at the end
                for (let i = path.length - 1; i > -1; i--) {
                    node = path[i];
                    if (node.type === "ExpressionStatement") {
                        break;
                    }
                }
                let expr = node.expression;
                node.expression = {
                    type: "AssignmentExpression",
                    left: expr,
                    right: { type: "Placeholder" }
                };
                column += 3;
            }
            update(row, column);
        } else if (/[\+\-\*\/<>]/.test(c)) {
            if (cursorParentNode.type === "VariableDeclarator") {
                if (findPropName(cursorParentNode, cursorNode) === "id") {
                    return;
                }
            }
            if (cursorParentNode.type === "FunctionExpression") {
                if (cursorParentNode.params.findIndex(param => param === cursorNode) !== -1) {
                    return;
                }
            }
            let left = JSON.parse(JSON.stringify(cursorNode));
            cursorNode.type = "BinaryExpression";
            cursorNode.left = left;
            cursorNode.right = { type: "Placeholder" };
            cursorNode.operator = c;
            column += 3;
            update(row, column);
        } else if (c === " ") {
            // TODO create a function called "promoteIdentifier"
            if (cursorParentNode.type === "ExpressionStatement") {
                let node = null;

                if (cursorNode.name === "let") {
                    node = {
                        type: "VariableDeclaration",
                        declarations: [{
                            type: "VariableDeclarator",
                            id: {
                                type: "Placeholder",
                                accept: "Identifier"
                            },
                            init: {
                                type: "Placeholder"
                            }
                        }],
                        kind: "let"
                    };
                    column += 1;
                } else if (cursorNode.name === "for") {
                    node = {
                        type: "ForOfStatement",
                        left: { type: "Placeholder" },
                        right: { type: "Placeholder" },
                        body: {
                            type: "BlockStatement",
                            body: [{
                                type: "BlankStatement"
                            }]
                        }
                    };
                    column += 2;
                } else if (cursorNode.name === "if") {
                    node = {
                        type: "IfStatement",
                        test: { type: "Placeholder" },
                        consequent: {
                            type: "BlockStatement",
                            body: [
                                { type: "BlankStatement" }
                            ]
                        },
                        alternate: null
                    };
                    column += 2;
                } else if (cursorNode.name === "return") {
                    // TODO check if we're inside a function
                    node = {
                        type: "ReturnStatement",
                        argument: { type: "Placeholder" }
                    };
                    column += 1;
                } else if (cursorNode.name === "class") {
                    node = {
                        type: "ClassDeclaration",
                        id: {
                            type: "Placeholder",
                            accept: "Identifier"
                        },
                        body: {
                            type: "ClassBody",
                            body: [
                                { type: 'BlankStatement' }
                            ]
                        }
                    };
                    column += 1;
                }

                if (node !== null) {
                    clearProps(cursorParentNode);
                    copyProps(node, cursorParentNode);
                    update(row, column);
                }
            } else if (cursorParentNode.type === "ForOfStatement") {
                let node = null;

                if (cursorNode.name === "let") {
                    node = {
                        type: "VariableDeclaration",
                        declarations: [{
                            type: "VariableDeclarator",
                            id: {
                                type: "Placeholder",
                                accept: "Identifier"
                            },
                            init: null
                        }],
                        kind: "let"
                    };
                    column += 1;
                }
                if (node !== null) {
                    clearProps(cursorNode);
                    copyProps(node, cursorNode);
                    update(row, column);
                }
            }
        } else if (c === "(") {
            if (cursorNode.name === "function") {
                clearProps(cursorNode);
                let node = {
                    "type": "FunctionExpression",
                    "id": null,
                    "params": [],
                    "defaults": [],
                    "body": {
                        "type": "BlockStatement",
                        "body": [
                            { type: "BlankStatement" }
                        ]
                    },
                    "generator": false,
                    "expression": false
                };
                copyProps(node, cursorNode);
                column += 2;
            } else {
                let callee = JSON.parse(JSON.stringify(cursorNode));
                clearProps(cursorNode);
                cursorNode.type = "CallExpression";
                cursorNode.callee = callee;
                cursorNode.arguments = [];
                column += 1;
            }
            update(row, column);
        } else if (c === ".") {
            let obj = JSON.parse(JSON.stringify(cursorNode));
            clearProps(cursorNode);
            cursorNode.type = "MemberExpression";
            cursorNode.object = obj;
            cursorNode.property = {
                type: "Placeholder",
                accept: "Identifier"
            };
            cursorNode.computed = false;
            column += 1;
            update(row, column);
        }  else if (c === "[") {
            let obj = JSON.parse(JSON.stringify(cursorNode));
            clearProps(cursorNode);
            cursorNode.type = "MemberExpression";
            cursorNode.object = obj;
            cursorNode.property = {
                type: "Placeholder"
            };
            cursorNode.computed = true;
            column += 1;
            update(row, column);
        }
    } else if (cursorNode.type === "LineComment") {
        let str = cursorNode.content;
        let relIdx = column - cursorNode.loc.start.column - 3;  // compensate for "// " prefix
        str = str.substring(0,relIdx) + c + str.substring(relIdx);
        cursorNode.content = str;
        column += 1;

        update(row, column);
    } else if (cursorNode.type === "BlankStatement") {
        if (/[a-zA-Z]/.test(c)) {
            if (cursorParentNode.type === "ClassBody") {
                cursorNode.type = "MethodDefinition";
                cursorNode.key = {
                    type: "Identifier",
                    name: c
                };
                cursorNode.value = {
                    "type": "FunctionExpression",
                    "id": null,
                    "params": [],
                    "defaults": [],
                    "body": {
                        "type": "BlockStatement",
                        "body": [
                            { type: "BlankStatement" }
                        ]
                    },
                    "generator": false,
                    "expression": false
                };
                column += 1;
            } else {
                cursorNode.type = "ExpressionStatement";
                cursorNode.expression = {
                    type: "Identifier",
                    name: c
                };
                column += 1;
            }
            update(row, column);
        }
    } else if (cursorNode.type === "CallExpression") {
        let node = {};
        if (/[0-9\.]/.test(c)) {
            node.type = "Literal";
            if (c === ".") {
                node.raw = "0.";
                column += 1;
            } else {
                node.raw = c;
            }
            column += 1;
            // TODO verify that the cursor is in the param list
            // TODO create an actual node for param/arg lists
            cursorNode.arguments = [node];
            update(row, column);
        } else if (/[a-zA-Z\_\$]/.test(c)) {
            node.type = "Identifier";
            node.name = c;
            column += 1;
            // TODO verify that the cursor is in the param list
            // TODO create an actual node for param/arg lists
            cursorNode.arguments = [node];
            update(row, column);
        } else if (/[\+\-\*\/<>]/.test(c) && (!cursorNode.accept || cursorNode.accept === "BinaryExpression")) {
            let left = JSON.parse(JSON.stringify(cursorNode));
            cursorNode.type = "BinaryExpression";
            cursorNode.left = left;
            cursorNode.right = { type: "Placeholder" };
            cursorNode.operator = c;
            column += 3;
            update(row, column);
        }
    } else if (cursorNode.type === "FunctionExpression") {
        let node = {};
        if (/[a-zA-Z\_\$]/.test(c)) {
            node.type = "Identifier";
            node.name = c;
            column += 1;
            // TODO verify that the cursor is in the param list
            // TODO create an actual node for param/arg lists
            cursorNode.params = [node];
        }
        update(row, column);
    } else if (cursorNode.type === "MemberExpression") {
        if (/[\+\-\*\/<>]/.test(c)) {
            let left = JSON.parse(JSON.stringify(cursorNode));
            clearProps(cursorNode);
            cursorNode.type = "BinaryExpression";
            cursorNode.left = left;
            cursorNode.right = { type: "Placeholder" };
            cursorNode.operator = c;
            column += 3;
            update(row, column);
        }
    } else if (cursorNode.type === "IfStatement") {
        // TODO: check if the cursor's at the end of the IfStatement
        if (c === " ") {
            if (cursorNode.alternate === null) {
                cursorNode.alternate = {
                    type: "BlockStatement",
                    body: [
                        { type: "BlankStatement" }
                    ]
                };
                update(row, column);
            }
        }
    }
};

let backspace = function(path, row, column) {
    let { cursorStatementParentNode } = findNode(prog, row + 1, column);

    let node1 = path[path.length - 1];
    let node2 = path[path.length - 2];
    let node3 = path[path.length - 3];
    let node4 = path[path.length - 4];

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
        } else if (node2.type === "CallExpression") {
            let args = node2.arguments;
            let idx = args.findIndex(arg => node1 === arg);
            if (idx === -1) return;
            
            args.splice(idx, 1);
            if (args.length > 0) {
                column -= 3;
            } else {
                column -= 1;
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
        } else if (node2.type === "VariableDeclarator") {
            let propName = findPropName(node2, node1);
            if (propName === "id") {
                if (node3.declarations.length > 1) {
                    // TODO handle multiple decls
                } else {
                    column -= node3.kind.length + 2;
                    clearProps(node3);
                    if (node4.type === "ForOfStatement") {
                        node3.type = "Placeholder";
                    } else {
                        node3.type = "BlankStatement";
                    }
                    update(row, column);
                }
            }
        } else if(node2.type === "MemberExpression") {
            // TODO: check both sides of the dot and maintain the one that isn't a placeholder
            let obj = node2.object;
            clearProps(node2);
            copyProps(obj, node2);
            column -= 2;
            update(row, column);
        }
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

module.exports = {
    init(aceEditor, ast) {
        editor = aceEditor;
        session = aceEditor.getSession();
        prog = ast;

        session.setValue(renderAST(prog));
        selection = editor.getSession().getSelection();
    }
};
