(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define(factory);
	else if(typeof exports === 'object')
		exports["ASTEditor"] = factory();
	else
		root["ASTEditor"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	module.exports = {
	    init: function init(editor) {
	        var editing = __webpack_require__(1);
	        var navigation = __webpack_require__(5);

	        editing.init(editor);
	        navigation.init(editor);
	    }
	};

	// TODO: dragging to create a selection should always select nodes that make sense to replace or delete
	// TODO: delete => replace with Placeholder
	// TODO: figure out undo/redo on the AST
	// TODO: certain nodes can be edited, e.g. Literals, Identifiers... other nodes can not
	// TODO: select the whole node when it can't be edited when placing the cursor somewhere
	// TODO: handle replacing the current selection
	// TODO: undo/redo using either ast-path to identify nodes or use references for children in the AST
	// TODO: create a custom highlight mode in ace that uses the AST to determine colors
	// TODO: have ace scroll to the line it was on before we replaced everything
	// TODO: don't replace everything in the ace editor

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var renderAST = __webpack_require__(2).renderAST;

	var _require = __webpack_require__(3);

	var findNode = _require.findNode;
	var findPropName = _require.findPropName;
	var findNodePath = _require.findNodePath;

	var prog = __webpack_require__(4);

	var session = editor.getSession();
	session.setValue(renderAST(prog));
	session.on("change", function (e) {
	    console.log(e);
	});

	var clearProps = function clearProps(node) {
	    Object.keys(node).forEach(function (key) {
	        delete node[key];
	    });
	};

	var copyProps = function copyProps(srcNode, dstNode) {
	    Object.keys(srcNode).forEach(function (key) {
	        dstNode[key] = srcNode[key];
	    });
	};

	var hideCursor = function hideCursor() {
	    document.querySelector('.ace_cursor-layer').style.opacity = 0.0;
	};

	var showCursor = function showCursor() {
	    document.querySelector('.ace_cursor-layer').style.opacity = 1.0;
	};

	var selection = editor.getSession().getSelection();

	/**
	 * Render the AST and update the cursor location
	 * @param row
	 * @param column
	 */
	var update = function update(row, column) {
	    session.setValue(renderAST(prog));
	    selection.setSelectionRange({
	        start: { row: row, column: column },
	        end: { row: row, column: column }
	    });
	};

	document.addEventListener('keypress', function (e) {
	    e.preventDefault();

	    var range = editor.getSelectionRange();
	    var row = range.end.row;
	    var column = range.end.column;
	    var line = row + 1;

	    var _findNode = findNode(prog, line, column);

	    var cursorNode = _findNode.cursorNode;
	    var cursorParentNode = _findNode.cursorParentNode;

	    if (!cursorNode) {
	        return;
	    }

	    var c = String.fromCharCode(e.keyCode);

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
	    var range = editor.getSelectionRange();
	    var row = range.end.row;
	    var column = range.end.column;
	    var line = row + 1;

	    var path = findNodePath(prog, line, column);

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

	var insert = function insert(c, cursorNode, cursorParentNode, row, column) {
	    var line = row + 1;

	    if (c === ",") {
	        (function () {
	            var path = findNodePath(prog, line, column);
	            var expression = null;
	            var parent = null;
	            // find the largest expression such that the cursor as the end of it
	            for (var i = path.length - 1; i > -1; i--) {
	                var node = path[i];
	                if (node.loc.end.column === column) {
	                    expression = node;
	                    parent = path[i - 1];
	                }
	            }
	            if (expression && parent && parent.type === "ArrayExpression") {
	                var elements = parent.elements;
	                var idx = elements.findIndex(function (element) {
	                    return expression === element;
	                });

	                if (idx !== -1) {
	                    var node = {
	                        type: "Placeholder"
	                    };
	                    elements.splice(idx + 1, 0, node);
	                    column += 3; // ", ?".length

	                    update(row, column);
	                }
	            }
	            if (expression && parent && parent.type === "FunctionExpression") {
	                var params = parent.params;
	                var idx = params.findIndex(function (param) {
	                    return expression === param;
	                });

	                if (idx !== -1) {
	                    var node = {
	                        type: "Placeholder",
	                        accept: "Identifier"
	                    };
	                    params.splice(idx + 1, 0, node);
	                    column += 3; // ", ?".length

	                    update(row, column);
	                }
	            }
	            if (expression && parent && parent.type === "CallExpression") {
	                var args = parent.arguments;
	                var idx = args.findIndex(function (param) {
	                    return expression === param;
	                });

	                if (idx !== -1) {
	                    var node = {
	                        type: "Placeholder"
	                    };
	                    args.splice(idx + 1, 0, node);
	                    column += 3; // ", ?".length

	                    update(row, column);
	                }
	            }
	        })();
	    } else if (cursorNode.type === "ArrayExpression" && cursorNode.elements.length === 0) {
	        var node = null;
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
	                if (cursorParentNode.params.findIndex(function (param) {
	                    return param === cursorNode;
	                }) !== -1) {
	                    return;
	                }
	            }
	            var left = JSON.parse(JSON.stringify(cursorNode));
	            cursorNode.type = "BinaryExpression";
	            cursorNode.left = left;
	            cursorNode.right = { type: "Placeholder" };
	            cursorNode.operator = c;
	            column += 3;
	        }
	        update(row, column);
	    } else if (cursorNode.type === "Literal") {
	        if (/[0-9\.]/.test(c)) {
	            var str = cursorNode.raw;
	            if (c === "." && str.indexOf(".") !== -1) {
	                return; // can't have more than one decimal
	            }
	            var relIdx = column - cursorNode.loc.start.column;
	            str = str.substring(0, relIdx) + c + str.substring(relIdx);
	            cursorNode.raw = str;
	            column += 1;

	            update(row, column);
	        } else if (/[\+\-\*\/<>]/.test(c)) {
	            var left = JSON.parse(JSON.stringify(cursorNode));
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
	            var str = cursorNode.name;
	            var relIdx = column - cursorNode.loc.start.column;
	            str = str.substring(0, relIdx) + c + str.substring(relIdx);
	            cursorNode.name = str;
	            column += 1;

	            update(row, column);
	        } else if (c === "=" && cursorParentNode.type === "ExpressionStatement") {
	            cursorParentNode.expression = {
	                type: "AssignmentExpression",
	                left: cursorNode,
	                right: {
	                    type: "Placeholder"
	                }
	            };
	            column += 3;
	            update(row, column);
	        } else if (/[\+\-\*\/<>]/.test(c)) {
	            if (cursorParentNode.type === "VariableDeclarator") {
	                if (findPropName(cursorParentNode, cursorNode) === "id") {
	                    return;
	                }
	            }
	            if (cursorParentNode.type === "FunctionExpression") {
	                if (cursorParentNode.params.findIndex(function (param) {
	                    return param === cursorNode;
	                }) !== -1) {
	                    return;
	                }
	            }
	            var left = JSON.parse(JSON.stringify(cursorNode));
	            cursorNode.type = "BinaryExpression";
	            cursorNode.left = left;
	            cursorNode.right = { type: "Placeholder" };
	            cursorNode.operator = c;
	            column += 3;
	            update(row, column);
	        } else if (c === " ") {
	            // TODO create a function called "promoteIdentifier"
	            if (cursorParentNode.type === "ExpressionStatement") {
	                var node = null;

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
	                            body: [{ type: "BlankStatement" }]
	                        },
	                        alternate: null
	                    };
	                    column += 2;
	                } else if (cursorNode.name === "return") {
	                    node = {
	                        type: "ReturnStatement",
	                        argument: { type: "Placeholder" }
	                    };
	                    column += 1;
	                }

	                if (node !== null) {
	                    clearProps(cursorParentNode);
	                    copyProps(node, cursorParentNode);
	                    update(row, column);
	                }
	            } else if (cursorParentNode.type === "ForOfStatement") {
	                var node = null;

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
	                var node = {
	                    "type": "FunctionExpression",
	                    "id": null,
	                    "params": [],
	                    "defaults": [],
	                    "body": {
	                        "type": "BlockStatement",
	                        "body": [{ type: "BlankStatement" }]
	                    },
	                    "generator": false,
	                    "expression": false
	                };
	                copyProps(node, cursorNode);
	                column += 2;
	            } else {
	                var callee = JSON.parse(JSON.stringify(cursorNode));
	                clearProps(cursorNode);
	                cursorNode.type = "CallExpression";
	                cursorNode.callee = callee;
	                cursorNode.arguments = [];
	                column += 1;
	            }
	            update(row, column);
	        } else if (c === ".") {
	            var obj = JSON.parse(JSON.stringify(cursorNode));
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
	        } else if (c === "[") {
	            var obj = JSON.parse(JSON.stringify(cursorNode));
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
	        var str = cursorNode.content;
	        var relIdx = column - cursorNode.loc.start.column - 3; // compensate for "// " prefix
	        str = str.substring(0, relIdx) + c + str.substring(relIdx);
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
	                        "body": [{ type: "BlankStatement" }]
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
	        var node = {};
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
	            var left = JSON.parse(JSON.stringify(cursorNode));
	            cursorNode.type = "BinaryExpression";
	            cursorNode.left = left;
	            cursorNode.right = { type: "Placeholder" };
	            cursorNode.operator = c;
	            column += 3;
	            update(row, column);
	        }
	    } else if (cursorNode.type === "FunctionExpression") {
	        var node = {};
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
	            var left = JSON.parse(JSON.stringify(cursorNode));
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
	                    body: [{ type: "BlankStatement" }]
	                };
	                update(row, column);
	            }
	        }
	    }
	};

	var backspace = function backspace(path, row, column) {
	    var _findNode2 = findNode(prog, row + 1, column);

	    var cursorStatementParentNode = _findNode2.cursorStatementParentNode;

	    var node1 = path[path.length - 1];
	    var node2 = path[path.length - 2];
	    var node3 = path[path.length - 3];
	    var node4 = path[path.length - 4];

	    if (!node1) {
	        return;
	    }

	    var relIdx = column - node1.loc.start.column;

	    if (node1.type === "Placeholder") {
	        if (node2.type === "ArrayExpression") {
	            var elements = node2.elements;
	            var idx = elements.findIndex(function (element) {
	                return node1 === element;
	            });

	            if (idx === -1) return;

	            elements.splice(idx, 1);
	            if (elements.length > 0) {
	                column -= 3; // ", ?".length
	            } else {
	                    column -= 1; // "?".length
	                }
	            update(row, column);
	        } else if (node2.type === "FunctionExpression") {
	            var params = node2.params;
	            var idx = params.findIndex(function (param) {
	                return node1 === param;
	            });

	            if (idx === -1) return;

	            params.splice(idx, 1);
	            if (params.length > 0) {
	                column -= 3; // ", ?".length
	            } else {
	                    column -= 1; // "?".length
	                }
	            update(row, column);
	        } else if (node2.type === "CallExpression") {
	            var args = node2.arguments;
	            var idx = args.findIndex(function (arg) {
	                return node1 === arg;
	            });
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
	            var left = node2.left;
	            clearProps(node2);
	            node2.type = left.type;
	            copyProps(left, node2);
	            column -= 4;
	            update(row, column);
	        } else if (node2.type === "AssignmentExpression") {
	            var left = node2.left;
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
	            column -= 1; // "?".length
	            update(row, column);
	        } else if (node2.type === "ReturnStatement") {
	            clearProps(node2);
	            node2.type = "BlankStatement";
	            column -= 8; // "return ?".length
	            update(row, column);
	        } else if (node2.type === "VariableDeclarator") {
	            var propName = findPropName(node2, node1);
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
	        }
	        console.log(path);
	    } else if (node1.type === "ArrayExpression" && node1.elements.length === 0) {
	        clearProps(node1);
	        node1.type = "Placeholder";
	        update(row, column);
	    } else if (node1.type === "Literal") {
	        var str = node1.raw;
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
	        var str = String(node1.name);
	        if (str.length === 1) {
	            delete node1.name;
	            node1.type = "Placeholder";
	            if (node2.type === "VariableDeclarator") {
	                if (findPropName(node2, node1) === "id") {
	                    node1.accept = "Identifier";
	                }
	            }
	            if (node2.type === "FunctionExpression") {
	                if (node2.params.findIndex(function (param) {
	                    return param === node1;
	                }) !== -1) {
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
	        relIdx -= 3; // compensate for "// " prefix
	        var str = String(node1.content);
	        if (str.length > 0) {
	            str = str.substring(0, relIdx - 1) + str.substring(relIdx);
	            node1.content = str;
	            column -= 1;
	        }
	        update(row, column);
	    } else if (node1.type === "BlankStatement") {
	        var elements = node2.body;
	        var idx = elements.findIndex(function (element) {
	            return node1 === element;
	        });

	        if (idx !== -1) {
	            elements.splice(idx, 1);

	            row -= 1;
	            column = cursorStatementParentNode.loc.start.column;

	            update(row, column);
	        }
	    }
	};

	var enter = function enter(path, row, column) {
	    var _findNode3 = findNode(prog, row + 1, column);

	    var cursorNode = _findNode3.cursorNode;
	    var cursorParentNode = _findNode3.cursorParentNode;
	    var cursorStatementNode = _findNode3.cursorStatementNode;
	    var cursorStatementParentNode = _findNode3.cursorStatementParentNode;

	    console.log(cursorStatementNode);
	    if (cursorNode.type === "BlankStatement") {
	        var elements = cursorParentNode.body;
	        var idx = elements.findIndex(function (element) {
	            return cursorNode === element;
	        });

	        elements.splice(idx + 1, 0, { type: "BlankStatement" });
	        row += 1;
	        column = cursorParentNode.loc.start.column;
	        update(row, column);
	    } else if (cursorParentNode.type === "MethodDefinition") {
	        var classBody = path[path.length - 3];
	        var body = classBody.body;
	        // we use the cursorParentNode here because that's the MethodDefinition
	        // we're in, not the FunctionExpression which is the cursorNode
	        var idx = body.findIndex(function (node) {
	            return node === cursorParentNode;
	        });
	        if (idx !== -1) {
	            body.splice(idx + 1, 0, { type: "BlankStatement" });
	            row += 1;
	            column = cursorParentNode.loc.start.column;
	            update(row, column);
	        }
	    } else {
	        var elements = cursorStatementParentNode.body;
	        var idx = elements.findIndex(function (element) {
	            return cursorStatementNode === element;
	        });

	        elements.splice(idx + 1, 0, { type: "BlankStatement" });
	        row += 1;
	        column = cursorStatementParentNode.loc.start.column;
	        update(row, column);
	    }
	};

	module.exports = {
	    init: function init(aceEditor) {
	        editor = aceEditor;
	    }
	};

/***/ },
/* 2 */
/***/ function(module, exports) {

	"use strict";

	var indent = "    ";
	var line, column, indentLevel;

	function renderAST(node) {
	    line = 1;
	    column = 0;
	    indentLevel = 0;
	    return render(node);
	}

	var renderer = {
	    VariableDeclaration: function VariableDeclaration(node, parent) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };
	        var result = node.kind;
	        result += " ";
	        column += node.kind.length + 1; // node.kind.length + " ".length

	        node.declarations.forEach(function (decl, index) {
	            if (index > 0) {
	                result += ", ";
	                column += 2; // ", ".length
	            }
	            result += render(decl);
	        });

	        node.loc.end = { line: line, column: column };

	        if (parent && parent.type === "ForOfStatement") {
	            return result;
	        } else {
	            return result + ";";
	        }
	    },
	    VariableDeclarator: function VariableDeclarator(node) {
	        if (node.init) {
	            node.loc = {};
	            var result = render(node.id);
	            node.loc.start = node.id.loc.start;
	            result += " = ";
	            column += 3; // " = ".length
	            result += render(node.init);
	            node.loc.end = node.init.loc.end;
	            return result;
	        } else {
	            var result = render(node.id);
	            node.loc = node.id.loc;
	            return result;
	        }
	    },
	    Identifier: function Identifier(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };
	        column += node.name.length;
	        node.loc.end = { line: line, column: column };
	        return node.name;
	    },
	    Placeholder: function Placeholder(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };
	        column += 1; // "?".length
	        node.loc.end = { line: line, column: column };
	        return "?";
	    },
	    BlankStatement: function BlankStatement(node) {
	        node.loc = {
	            start: { line: line, column: column },
	            end: { line: line, column: column }
	        };
	        return "";
	    },
	    ForOfStatement: function ForOfStatement(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };

	        var result = "for (";
	        column += 5; // "for (".length

	        result += render(node.left, node);
	        result += " of ";
	        column += 4; // " of ".length
	        result += render(node.right);
	        result += ") ";

	        result += render(node.body);

	        node.loc.end = { line: line, column: column };

	        return result;
	    },
	    ArrayExpression: function ArrayExpression(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };

	        var result = "[";
	        column += 1;

	        node.elements.forEach(function (element, index) {
	            if (index > 0) {
	                result += ", ";
	                column += 2; // ", ".length
	            }
	            result += render(element);
	        });

	        result += "]";
	        column += 1;

	        node.loc.end = { line: line, column: column };

	        return result;
	    },
	    Literal: function Literal(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };
	        if (node.raw) {
	            column += String(node.raw).length;
	        } else {
	            column += String(node.value).length;
	        }
	        node.loc.end = { line: line, column: column };

	        return node.raw ? node.raw : node.value;
	    },
	    BlockStatement: function BlockStatement(node) {
	        var result = "{\n";

	        indentLevel += 1;
	        column += indentLevel * indent.length;
	        line += 1;

	        var children = node.body.map(function (statement) {
	            column = indentLevel * indent.length;
	            var result = indent.repeat(indentLevel) + render(statement);
	            line += 1;
	            return result;
	        });

	        // TODO guarantee that there's always one child
	        var first = node.body[0];
	        var last = node.body[children.length - 1];

	        node.loc = {};
	        node.loc.start = first.loc.start;
	        node.loc.end = last.loc.end;

	        result += children.join("\n") + "\n";

	        indentLevel -= 1;

	        result += indent.repeat(indentLevel) + "}";

	        return result;
	    },
	    ExpressionStatement: function ExpressionStatement(node) {
	        var expr = render(node.expression);

	        node.loc = {
	            start: node.expression.loc.start,
	            end: node.expression.loc.end
	        };

	        return expr + ";";
	    },
	    AssignmentExpression: function AssignmentExpression(node) {
	        var left = render(node.left);
	        column += 3; // " = ".length;
	        var right = render(node.right);

	        node.loc = {
	            start: node.left.loc.start,
	            end: node.right.loc.end
	        };

	        return left + " = " + right;
	    },
	    ReturnStatement: function ReturnStatement(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };

	        column += 7; // "return ".length
	        var arg = render(node.argument);

	        node.loc.end = node.argument.loc.end;

	        return "return " + arg + ";";
	    },
	    Program: function Program(node) {
	        // TODO: unify this with "BlockStatement" which has the same code
	        node.loc = {};
	        node.loc.start = { line: line, column: column };
	        var result = node.body.map(function (statement) {
	            column = indentLevel * indent.length;
	            var result = indent.repeat(indentLevel) + render(statement);
	            line += 1;
	            return result;
	        }).join("\n") + "\n";
	        node.loc.end = { line: line, column: column };
	        return result;
	    },
	    LineComment: function LineComment(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };
	        var result = "// " + node.content;
	        column += result.length;
	        node.loc.end = { line: line, column: column };
	        return result;
	    },
	    BlockComment: function BlockComment(node) {
	        // TODO: handle indent level
	        node.loc = {};
	        column = indent.length * indentLevel;
	        node.loc.start = { line: line, column: column };
	        var lines = node.content.split("\n");
	        var result = "/*\n" + lines.map(function (line) {
	            return "  " + line + "\n";
	        }).join("") + " */";
	        line += 1 + lines.length; // Program or BlockStatements add another \n
	        column = indent.length * indentLevel;
	        node.loc.end = { line: line, column: column };
	        return result;
	    },
	    BinaryExpression: function BinaryExpression(node) {
	        var left = render(node.left);
	        column += 3; // e.g. " + ".length;
	        var right = render(node.right);

	        node.loc = {
	            start: node.left.loc.start,
	            end: node.right.loc.end
	        };

	        return left + " " + node.operator + " " + right;
	    },
	    Parentheses: function Parentheses(node) {
	        node.loc = {};
	        column += 1; // "(".length
	        var expr = render(node.expression);
	        column += 1; // ")".length
	        var _node$expression$loc = node.expression.loc;
	        var start = _node$expression$loc.start;
	        var end = _node$expression$loc.end;

	        node.loc = {
	            start: {
	                line: start.line,
	                column: start.column - 1
	            },
	            end: {
	                line: end.line,
	                column: end.column + 1
	            }
	        };
	        return "(" + expr + ")";
	    },
	    ClassDeclaration: function ClassDeclaration(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };

	        var result = "class ";
	        column += 6; // "class ".length

	        // not advancing column here is okay because ClassBody (BlockStatement)
	        // resets column when it advances to the first line of the body
	        result += render(node.id) + " " + render(node.body);

	        node.loc.end = { line: line, column: column };

	        return result;
	    },
	    ClassBody: function ClassBody(node) {
	        return this.BlockStatement(node);
	    },
	    MethodDefinition: function MethodDefinition(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };
	        var result = render(node.key);

	        result += "(";
	        column += 1;
	        node.value.params.forEach(function (element, index) {
	            if (index > 0) {
	                result += ", ";
	                column += 2; // ", ".length
	            }
	            result += render(element);
	        });
	        result += ")";
	        result += " ";

	        result += render(node.value.body);

	        node.loc.end = { line: line, column: column };

	        // kind of a hack b/c there isn't a FunctionExpression rendered in the
	        // the classical sense
	        // TODO figure how to fix this so we can access the identifier separately
	        node.value.loc = {};
	        node.value.loc.start = JSON.parse(JSON.stringify(node.key.loc.end));
	        node.value.loc.start.column += 1;
	        node.value.loc.end = node.loc.end;
	        console.log(node.value.loc);

	        return result;
	    },
	    CallExpression: function CallExpression(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };
	        var result = render(node.callee);

	        result += "(";
	        column += 1;
	        node.arguments.forEach(function (arg, index) {
	            if (index > 0) {
	                result += ", ";
	                column += 2; // ", ".length
	            }
	            result += render(arg);
	        });
	        result += ")";
	        column += 1;

	        node.loc.end = { line: line, column: column };

	        return result;
	    },
	    FunctionExpression: function FunctionExpression(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };

	        var result = "function (";
	        column += result.length;
	        node.params.forEach(function (element, index) {
	            if (index > 0) {
	                result += ", ";
	                column += 2; // ", ".length
	            }
	            result += render(element);
	        });
	        result += ")";
	        result += " ";

	        result += render(node.body);

	        node.loc.end = { line: line, column: column };

	        return result;
	    },
	    MemberExpression: function MemberExpression(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };

	        var result = render(node.object);
	        if (node.computed) {
	            result += "[";
	            column += 1;
	            result += render(node.property);
	            result += "]";
	            column += 1;
	        } else {
	            result += ".";
	            column += 1; // ".".length
	            result += render(node.property);
	        }

	        node.loc.end = { line: line, column: column };

	        return result;
	    },
	    IfStatement: function IfStatement(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };

	        var result = "if (";
	        column += result.length;

	        result += render(node.test);
	        result += ") ";
	        result += render(node.consequent);

	        if (node.alternate) {
	            result += " else {\n";
	            indentLevel += 1;
	            column += indentLevel * indent.length;
	            line += 1;
	            result += render(node.consequent);

	            indentLevel -= 1;
	            result += indent.repeat(indentLevel) + "}";
	        }

	        node.loc.end = { line: line, column: column };

	        return result;
	    },
	    ThisExpression: function ThisExpression(node) {
	        node.loc = {};
	        node.loc.start = { line: line, column: column };
	        column += 4;
	        node.loc.end = { line: line, column: column };

	        return "this";
	    }
	};

	function render(node, parent) {
	    if (renderer[node.type]) {
	        return renderer[node.type](node, parent);
	    } else {
	        throw node.type + " not supported yet";
	    }
	}

	module.exports = {
	    renderAST: renderAST
	};

/***/ },
/* 3 */
/***/ function(module, exports) {

	"use strict";

	var findPropName = function findPropName(parent, node) {
	    if (["BinaryExpression", "AssignmentExpression"].indexOf(parent.type) !== -1) {
	        if (parent.right === node) {
	            return "right";
	        }
	        if (parent.left === node) {
	            return "left";
	        }
	    } else if (parent.type === "VariableDeclarator") {
	        if (parent.id === node) {
	            return "id";
	        }
	        if (parent.init === node) {
	            return "init";
	        }
	    } else if (["ExpressionStatement", "Parentheses"].indexOf(parent.type) !== -1) {
	        return "expression";
	    }
	};

	var cursorNode = null;
	var cursorParentNode = null;
	var cursorStatementNode = null;
	var cursorStatementParentNode = null;

	function _findNode(node, parent, line, column) {
	    if (node.loc) {
	        var _node$loc = node.loc;
	        var start = _node$loc.start;
	        var end = _node$loc.end;

	        var cursorAfterStart = line > start.line || line === start.line && column >= start.column;
	        var cursorBeforeEnd = line < end.line || line === end.line && column <= end.column;
	        if (cursorAfterStart && cursorBeforeEnd) {
	            cursorNode = node;
	            cursorParentNode = parent;
	            if (/Statement|Declaration/.test(node.type)) {
	                cursorStatementNode = node;
	                cursorStatementParentNode = parent;
	            }
	            var _iteratorNormalCompletion = true;
	            var _didIteratorError = false;
	            var _iteratorError = undefined;

	            try {
	                for (var _iterator = Object.keys(node)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	                    var key = _step.value;

	                    if (key === "type") {
	                        continue;
	                    }
	                    if (key === "loc") {
	                        continue;
	                    }
	                    if (!node.hasOwnProperty(key)) {
	                        continue;
	                    }
	                    var value = node[key];
	                    if (value === null) {
	                        continue;
	                    }
	                    if (Array.isArray(value)) {
	                        var _iteratorNormalCompletion2 = true;
	                        var _didIteratorError2 = false;
	                        var _iteratorError2 = undefined;

	                        try {
	                            for (var _iterator2 = value[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
	                                var child = _step2.value;

	                                _findNode(child, node, line, column);
	                            }
	                        } catch (err) {
	                            _didIteratorError2 = true;
	                            _iteratorError2 = err;
	                        } finally {
	                            try {
	                                if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
	                                    _iterator2["return"]();
	                                }
	                            } finally {
	                                if (_didIteratorError2) {
	                                    throw _iteratorError2;
	                                }
	                            }
	                        }
	                    }
	                    _findNode(value, node, line, column);
	                }
	            } catch (err) {
	                _didIteratorError = true;
	                _iteratorError = err;
	            } finally {
	                try {
	                    if (!_iteratorNormalCompletion && _iterator["return"]) {
	                        _iterator["return"]();
	                    }
	                } finally {
	                    if (_didIteratorError) {
	                        throw _iteratorError;
	                    }
	                }
	            }
	        }
	    }
	}

	function findNode(root, line, column) {
	    cursorNode = null;
	    cursorParentNode = null;

	    _findNode(root, null, line, column);

	    return { cursorNode: cursorNode, cursorParentNode: cursorParentNode, cursorStatementNode: cursorStatementNode, cursorStatementParentNode: cursorStatementParentNode };
	}

	var path = null;

	function _findNodePath(node, line, column) {
	    if (node.loc) {
	        var _node$loc2 = node.loc;
	        var start = _node$loc2.start;
	        var end = _node$loc2.end;

	        var cursorAfterStart = line > start.line || line === start.line && column >= start.column;
	        var cursorBeforeEnd = line < end.line || line === end.line && column <= end.column;
	        if (cursorAfterStart && cursorBeforeEnd) {
	            path.push(node);
	            var _iteratorNormalCompletion3 = true;
	            var _didIteratorError3 = false;
	            var _iteratorError3 = undefined;

	            try {
	                for (var _iterator3 = Object.keys(node)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
	                    var key = _step3.value;

	                    if (key === "type") {
	                        continue;
	                    }
	                    if (key === "loc") {
	                        continue;
	                    }
	                    if (!node.hasOwnProperty(key)) {
	                        continue;
	                    }
	                    var value = node[key];
	                    if (value === null) {
	                        continue;
	                    }
	                    if (Array.isArray(value)) {
	                        var _iteratorNormalCompletion4 = true;
	                        var _didIteratorError4 = false;
	                        var _iteratorError4 = undefined;

	                        try {
	                            for (var _iterator4 = value[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
	                                var child = _step4.value;

	                                _findNodePath(child, line, column);
	                            }
	                        } catch (err) {
	                            _didIteratorError4 = true;
	                            _iteratorError4 = err;
	                        } finally {
	                            try {
	                                if (!_iteratorNormalCompletion4 && _iterator4["return"]) {
	                                    _iterator4["return"]();
	                                }
	                            } finally {
	                                if (_didIteratorError4) {
	                                    throw _iteratorError4;
	                                }
	                            }
	                        }
	                    }
	                    _findNodePath(value, line, column);
	                }
	            } catch (err) {
	                _didIteratorError3 = true;
	                _iteratorError3 = err;
	            } finally {
	                try {
	                    if (!_iteratorNormalCompletion3 && _iterator3["return"]) {
	                        _iterator3["return"]();
	                    }
	                } finally {
	                    if (_didIteratorError3) {
	                        throw _iteratorError3;
	                    }
	                }
	            }
	        }
	    }
	}

	function findNodePath(root, line, column) {
	    path = [];

	    _findNodePath(root, line, column);

	    return path;
	}

	module.exports = {
	    findNode: findNode, findPropName: findPropName, findNodePath: findNodePath
	};

/***/ },
/* 4 */
/***/ function(module, exports) {

	"use strict";

	var prog = {
	    type: "Program",
	    body: [{
	        type: "LineComment",
	        content: "Single line comment" // newlines are disallowed
	    }, {
	        type: "BlockComment",
	        content: "Block Comment\nLine 1\nLine 2"
	    }, {
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
	    }, {
	        type: "ForOfStatement",
	        left: {
	            type: "Identifier",
	            name: "a"
	        },
	        right: {
	            type: "ArrayExpression",
	            elements: [{ type: "Literal", raw: "1.0" }, { type: "Literal", raw: "2." }, { type: "Literal", raw: "3" }, { type: "Placeholder" }]
	        },
	        body: {
	            type: "BlockStatement",
	            body: [{
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
	            }, { type: "BlankStatement" }, {
	                type: "ReturnStatement",
	                argument: {
	                    type: "Identifier",
	                    name: "b"
	                }
	            }]
	        }
	    }, { type: "BlankStatement" }, {
	        type: "ClassDeclaration",
	        id: {
	            type: "Identifier",
	            name: "Foo"
	        },
	        body: {
	            type: "ClassBody",
	            body: [{
	                type: "MethodDefinition",
	                key: {
	                    type: "Identifier",
	                    name: "constructor"
	                },
	                value: {
	                    "type": "FunctionExpression",
	                    "id": null,
	                    "params": [],
	                    "defaults": [],
	                    "body": {
	                        "type": "BlockStatement",
	                        "body": [{ type: "BlankStatement" }]
	                    },
	                    "generator": false,
	                    "expression": false
	                },
	                kind: "constructor",
	                computed: false,
	                "static": false
	            }, {
	                type: "MethodDefinition",
	                key: {
	                    type: "Identifier",
	                    name: "bar"
	                },
	                value: {
	                    "type": "FunctionExpression",
	                    "id": null,
	                    "params": [{
	                        type: "Identifier",
	                        name: "x"
	                    }, {
	                        type: "Placeholder",
	                        accept: "Identifier"
	                    }],
	                    "defaults": [],
	                    "body": {
	                        "type": "BlockStatement",
	                        "body": [{ type: "BlankStatement" }]
	                    },
	                    "generator": false,
	                    "expression": false
	                },
	                kind: "constructor",
	                computed: false,
	                "static": false
	            }]
	        }
	    }, {
	        type: "ExpressionStatement",
	        expression: {
	            type: "AssignmentExpression",
	            left: {
	                type: "Identifier",
	                name: "zed"
	            },
	            right: {
	                type: "ThisExpression"
	            }
	        }
	    }]
	};

	module.exports = prog;

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var renderAST = __webpack_require__(2).renderAST;

	var _require = __webpack_require__(3);

	var findNode = _require.findNode;
	var findPropName = _require.findPropName;
	var findNodePath = _require.findNodePath;

	var prog = __webpack_require__(4);

	var clearProps = function clearProps(node) {
	    Object.keys(node).forEach(function (key) {
	        delete node[key];
	    });
	};

	var copyProps = function copyProps(srcNode, dstNode) {
	    Object.keys(srcNode).forEach(function (key) {
	        dstNode[key] = srcNode[key];
	    });
	};

	var hideCursor = function hideCursor() {
	    document.querySelector('.ace_cursor-layer').style.opacity = 0.0;
	};

	var showCursor = function showCursor() {
	    document.querySelector('.ace_cursor-layer').style.opacity = 1.0;
	};

	var selection = editor.getSession().getSelection();
	var session = editor.getSession();

	var update = function update(row, column) {
	    session.setValue(renderAST(prog));
	    selection.setSelectionRange({
	        start: { row: row, column: column },
	        end: { row: row, column: column }
	    });
	};

	var setCursor = function setCursor(row, column, isPlaceholder) {
	    if (isPlaceholder) {
	        selection.setSelectionRange({
	            start: { row: row, column: column },
	            end: { row: row, column: column + 1 }
	        });
	    } else {
	        selection.setSelectionRange({
	            start: { row: row, column: column },
	            end: { row: row, column: column }
	        });
	    }
	};

	selection.on("changeCursor", function (e) {
	    var range = editor.getSelectionRange();
	    var line = range.start.row + 1;
	    var column = range.start.column;

	    var _findNode = findNode(prog, line, column);

	    var cursorNode = _findNode.cursorNode;

	    console.log(cursorNode);
	    if (cursorNode.type === "Placeholder") {
	        var loc = cursorNode.loc;
	        var row = loc.start.line - 1;
	        selection.setSelectionRange({
	            start: { row: row, column: loc.start.column },
	            end: { row: row, column: loc.end.column }
	        });
	        hideCursor();
	    } else if (["AssignmentExpression", "BinaryExpression"].indexOf(cursorNode.type) !== -1) {
	        var loc = cursorNode.left.loc;
	        var row = loc.end.line - 1;
	        var _column = loc.end.column + 1;
	        selection.setSelectionRange({
	            start: {
	                row: row,
	                column: _column
	            },
	            end: {
	                row: row,
	                column: _column + 1
	            }
	        });
	        hideCursor();
	    } else {
	        showCursor();
	    }
	});

	document.addEventListener('keydown', function (e) {
	    var range = editor.getSelectionRange();
	    var row = range.end.row;
	    var column = range.end.column;
	    var line = row + 1;

	    var path = findNodePath(prog, line, column);

	    // ignore tabs
	    if (e.keyCode === 9) {
	        e.stopPropagation();
	        e.preventDefault();
	    }

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

	var left = function left(path, row, column) {
	    var _findNode2 = findNode(prog, row + 1, column);

	    var cursorNode = _findNode2.cursorNode;
	    var cursorParentNode = _findNode2.cursorParentNode;

	    if (["Literal", "Identifier"].indexOf(cursorNode.type) !== -1) {
	        if (cursorNode.loc.start.column <= column - 1) {
	            column -= 1;
	            setCursor(row, column);
	            return;
	        }
	    }

	    for (var i = path.length - 1; i > 0; i--) {
	        var node = path[i];
	        var _parent = path[i - 1];

	        var propName = findPropName(_parent, node);

	        if (propName === "right") {
	            var loc = _parent.left.loc;
	            row = loc.end.line - 1;
	            column = loc.end.column + 1;
	            setCursor(row, column, true);
	            hideCursor();
	            break;
	        } else if (propName === "init") {
	            // TODO: check the type, if it's a placeholder then we need to select it
	            var loc = _parent.id.loc;
	            row = loc.end.line - 1;
	            column = loc.end.column;
	            setCursor(row, column);
	            break;
	        }
	    }

	    if (["BinaryExpression", "AssignmentExpression"].indexOf(cursorNode.type) !== -1) {
	        column = cursorNode.left.loc.end.column;
	        setCursor(row, column);
	        return;
	    }

	    if (cursorParentNode.type === "ArrayExpression") {
	        var elements = cursorParentNode.elements;
	        var idx = elements.findIndex(function (element) {
	            return cursorNode === element;
	        });

	        if (idx > 0) {
	            cursorNode = cursorParentNode.elements[idx - 1];
	            column = cursorNode.loc.end.column; // assume same row
	            setCursor(row, column);
	        }
	        return;
	    }

	    if (cursorParentNode.type === "FunctionExpression") {
	        var params = cursorParentNode.params;
	        var idx = params.findIndex(function (param) {
	            return cursorNode === param;
	        });

	        if (idx > 0) {
	            cursorNode = cursorParentNode.params[idx - 1];
	            column = cursorNode.loc.end.column; // assume same row
	            setCursor(row, column);
	        }
	    }

	    if (cursorParentNode.type === "CallExpression") {
	        var args = cursorParentNode.arguments;
	        var idx = args.findIndex(function (arg) {
	            return cursorNode === arg;
	        });

	        if (idx > 0) {
	            cursorNode = cursorParentNode.arguments[idx - 1];
	            column = cursorNode.loc.end.column; // assume same row
	            setCursor(row, column);
	        }
	    }
	};

	var right = function right(path, row, column) {
	    var _findNode3 = findNode(prog, row + 1, column);

	    var cursorNode = _findNode3.cursorNode;
	    var cursorParentNode = _findNode3.cursorParentNode;

	    if (["Literal", "Identifier"].indexOf(cursorNode.type) !== -1) {
	        if (column + 1 <= cursorNode.loc.end.column) {
	            column += 1;
	            setCursor(row, column);
	            return;
	        }
	    }

	    for (var i = path.length - 1; i > 0; i--) {
	        var node = path[i];
	        var _parent2 = path[i - 1];

	        var propName = findPropName(_parent2, node);

	        if (propName === "left") {
	            var loc = _parent2.left.loc;
	            row = loc.end.line - 1;
	            column = loc.end.column + 1;
	            setCursor(row, column, true);
	            hideCursor();
	            break;
	        } else if (propName === "id" && cursorParentNode.type === "VariableDeclarator") {
	            column += 3;
	            setCursor(row, column);
	            //hideCursor();
	            // TODO: check the type, e.g. PlaceHolder

	            break;
	        }
	    }

	    if (["BinaryExpression", "AssignmentExpression"].indexOf(cursorNode.type) !== -1) {
	        column = cursorNode.right.loc.start.column;
	        setCursor(row, column);
	        return;
	    }

	    if (cursorParentNode.type === "ArrayExpression") {
	        var elements = cursorParentNode.elements;
	        var idx = elements.findIndex(function (element) {
	            return cursorNode === element;
	        });

	        if (idx < elements.length - 1) {
	            cursorNode = cursorParentNode.elements[idx + 1];
	            column = cursorNode.loc.start.column; // assume same row
	            setCursor(row, column);
	        }
	        return;
	    }

	    if (cursorParentNode.type === "FunctionExpression") {
	        var params = cursorParentNode.params;
	        var idx = params.findIndex(function (param) {
	            return cursorNode === param;
	        });

	        if (idx < params.length - 1) {
	            cursorNode = cursorParentNode.params[idx + 1];
	            column = cursorNode.loc.start.column; // assume same row
	            setCursor(row, column);
	        }
	    }

	    if (cursorParentNode.type === "CallExpression") {
	        var args = cursorParentNode.arguments;
	        var idx = args.findIndex(function (arg) {
	            return cursorNode === arg;
	        });

	        if (idx < args.length - 1) {
	            cursorNode = cursorParentNode.arguments[idx + 1];
	            column = cursorNode.loc.start.column; // assume same row
	            setCursor(row, column);
	        }
	    }
	};

	module.exports = {
	    init: function init(aceEditor) {
	        editor = aceEditor;
	    }
	};

/***/ }
/******/ ])
});
;