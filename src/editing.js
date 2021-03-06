let ASTEditor = require('./ast-editor.js');
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

ASTEditor.prototype.insert = function(c) {
    let row = this.row;
    let column = this.col;
    let update = this.update;
    let prog = this.ast;
    
    let path = findNodePath(prog, row + 1, column);
    let line = row + 1;
    let cursorNode = path[path.length - 1];
    let cursorParentNode = path[path.length - 2];

    if (cursorNode.type === "StringLiteral") {
        let str = cursorNode.value;
        let relIdx = column - cursorNode.loc.start.column;
        if (column === cursorNode.loc.end.column) {
            if (c === "+") {
                let left = JSON.parse(JSON.stringify(cursorNode));
                cursorNode.type = "BinaryExpression";
                cursorNode.left = left;
                cursorNode.right = { type: "Placeholder" };
                cursorNode.operator = c;
                column += 3;
            } else if (c === ",") {
                // TODO call the comma handling method
            }
        } else if (column === cursorNode.loc.start.column) {
            
        } else {
            if (c === "\"") {
                if (column === cursorNode.loc.end.column - 1) {
                    column += 1;
                }
                //str = str.substring(0, relIdx) + "\\\"" + str.substring(relIdx);
                //cursorNode.value = str;
                //column += 2;
            } else {
                str = str.substring(0, relIdx - 1) + c + str.substring(relIdx - 1);
                cursorNode.value = str;
                column += 1;
            }   
        }

        update(row, column);
    } else if (c === ",") {
        // TODO pull this out as a method so that it can be called in multiple places
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
        if (expression && parent && ["CallExpression", "NewExpression"].indexOf(parent.type) !== -1) {
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
    } else if (c === ")") {
        if (cursorParentNode.type === "FunctionExpression") {
            // TODO check that we're inside the param list
            // TODO create a function that gives the range of the param list
            let firstLine = cursorParentNode.body.body[0];
            row = firstLine.loc.start.line - 1;
            column = firstLine.loc.start.column;
            update(row, column);
        } else if (cursorParentNode.type === "MethodDefinition") {
            let firstLine = cursorParentNode.value.body.body[0];
            row = firstLine.loc.start.line - 1;
            column = firstLine.loc.start.column;
            update(row, column);
        } else {
            let nodes = findNode(prog, line, column + 1);
            if (["Parentheses", "CallExpression"].indexOf(nodes.cursorNode.type) !== -1) {
                column += 1;
                update(row, column);
            }
        }
    } else if (c === "]") {
        if (cursorParentNode.type === "ArrayExpression") {
            let nodes = findNode(prog, line, column + 1);
            if (nodes.cursorNode.type === "ArrayExpression") {
                column += 1;
                update(row, column);
            }
        }
    } else if (c === "\"") {
        if (cursorNode.type === "Placeholder") {
            clearProps(cursorNode);
            cursorNode.type = "StringLiteral";
            cursorNode.value = "";
            update(row, column);
        } else if (["CallExpression", "NewExpression"].indexOf(cursorNode.type) !== -1 && cursorNode.arguments.length === 0) {
            let node = {
                type: "StringLiteral",
                value: ""
            };
            column += 1;
            cursorNode.arguments = [node];
            update(row, column);
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
        } else if (c === "=") {
            let path = findNodePath(prog, line, column);

            let path1 = path[path.length - 1];
            let path2 = path[path.length - 2];
            let path3 = path[path.length - 3];
            
            if (path1.type === "Placeholder" && path2.type === "BinaryExpression" && path3.type === "ExpressionStatement") {
                path2.type = "AssignmentExpression";
                path2.operator += "=";
            }
        }
        update(row, column);
    } else if (cursorNode.type === "Literal") {
        if (/[0-9\.]/.test(c)) {
            let str = cursorNode.raw;
            if (c === "." && str.indexOf(".") !== -1) {
                return; // can't have more than one decimal
            }
            let relIdx = column - cursorNode.loc.start.column;
            str = str.substring(0, relIdx) + c + str.substring(relIdx);
            cursorNode.raw = str;
            column += 1;

            update(row, column);
        } else if (/[\+\-\*\/<>]/.test(c)) {
            let left = JSON.parse(JSON.stringify(cursorNode));
            clearProps(cursorNode);
            cursorNode.type = "BinaryExpression";
            cursorNode.left = left;
            cursorNode.right = {type: "Placeholder"};
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
                    operator: "=",
                    right: {
                        type: "Placeholder"
                    }
                };
                column += 3;
            } else if (cursorParentNode.type === "VariableDeclarator") {
                cursorParentNode.init = { type: "Placeholder" };
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
                    operator: "=",
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
                            init: null
                        }],
                        kind: "let"
                    };
                    column += 1;
                } else if (cursorNode.name === "for") {
                    node = {
                        type: "ForOfStatement",
                        left: {type: "Placeholder"},
                        right: {type: "Placeholder"},
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
                        test: {type: "Placeholder"},
                        consequent: {
                            type: "BlockStatement",
                            body: [
                                {type: "BlankStatement"}
                            ]
                        },
                        alternate: null
                    };
                    column += 2;
                } else if (cursorNode.name === "return") {
                    // TODO check if we're inside a function
                    node = {
                        type: "ReturnStatement",
                        argument: {type: "Placeholder"}
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
                                {type: 'BlankStatement'}
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
            } else if (cursorNode.type === "Identifier") {
                let node = null;
                if (cursorNode.name === "new") {
                    node = {
                        type: "NewExpression",
                        callee: {
                            type: "Placeholder",
                            accept: "Identifier"
                        },
                        arguments: []
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
                            {type: "BlankStatement"}
                        ]
                    },
                    "generator": false,
                    "expression": false
                };
                copyProps(node, cursorNode);
                column += 2;
            } else if (cursorParentNode.type === "MethodDefinition") {
                column += 1;
            } else if (cursorParentNode.type === "NewExpression") {
                column += 1;
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
    } else if (["CallExpression", "NewExpression"].indexOf(cursorNode.type) !== -1) {
        // TODO check how man arguments there are
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
        } else if (/[\+\-\*\/<>]/.test(c)) {
            let left = JSON.parse(JSON.stringify(cursorNode));
            cursorNode.type = "BinaryExpression";
            cursorNode.left = left;
            cursorNode.right = { type: "Placeholder" };
            cursorNode.operator = c;
            column += 3;
            update(row, column);
        }
    } else if (cursorNode.type === "Parentheses") {
        if (/[\+\-\*\/<>]/.test(c)) {
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

ASTEditor.prototype.backspace = function() {
    let row = this.row;
    let column = this.col;
    let update = this.update;
    let prog = this.ast;
    
    let path = findNodePath(prog, row + 1, column);
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
        } else if (["CallExpression", "NewExpression"].indexOf(node2.type) !== -1) {
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
            let operator = node2.operator;
            clearProps(node2);
            node2.type = left.type;
            copyProps(left, node2);
            column -= 3 + operator.length;
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
    } else if (node1.type === "StringLiteral") {
        let str = node1.value;
        if (str.length === 1) {
            delete node1.value;
            node1.type = "Placeholder";
            column -= 1;
        } else {
            let strRelIdx = relIdx - 1; // correct for quotes
            str = str.substring(0, strRelIdx - 1) + str.substring(strRelIdx);
            node1.value = str;
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

ASTEditor.prototype.enter = function() {
    let row = this.row;
    let column = this.col;
    let update = this.update;
    let prog = this.ast;
    
    let path = findNodePath(prog, row + 1, column);
    let { cursorNode, cursorParentNode, cursorStatementNode, cursorStatementParentNode } = findNode(prog, row + 1, column);

    if (cursorNode.type === "BlankStatement") {
        let elements = cursorParentNode.body;
        let idx = elements.findIndex(element => cursorNode === element);

        elements.splice(idx + 1, 0, {type: "BlankStatement"});
        row += 1;
        column = cursorParentNode.loc.start.column;
        update(row, column);
    } else if (cursorNode.type === "Program") {
        let body = cursorNode.body;
        body.push({type: "BlankStatement"});
        row += 1;
        update(row, column);
    } else if (cursorParentNode.type === "MethodDefinition") {
        let classBody = path[path.length - 3];
        let body = classBody.body;
        // we use the cursorParentNode here because that's the MethodDefinition
        // we're in, not the FunctionExpression which is the cursorNode
        let idx = body.findIndex(node => node === cursorParentNode);
        if (idx !== -1) {
            body.splice(idx + 1, 0, {type: "BlankStatement"});
            row += 1;
            column = cursorParentNode.loc.start.column;
            update(row, column);
        }
    } else {
        let elements = cursorStatementParentNode.body;
        let idx = elements.findIndex(element => cursorStatementNode === element);
        
        if (column === cursorStatementNode.loc.start.column) {
            elements.splice(idx, 0, { type: "BlankStatement" });
        } else if (column === cursorStatementNode.loc.end.column) {
            elements.splice(idx + 1, 0, { type: "BlankStatement" });
        }
        
        row += 1;
        column = cursorStatementParentNode.loc.start.column;
        update(row, column);
    }
};
