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

let setCursor = function(row, column, isPlaceholder) {
    if (isPlaceholder) {
        selection.setSelectionRange({
            start: { row, column },
            end: { row, column: column + 1 }
        });
    } else {
        selection.setSelectionRange({
            start: { row, column },
            end: { row, column }
        });   
    }
};

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

    if (e.keyCode === 37) {
        e.preventDefault();
        e.stopPropagation();
        left(path, row, column);
    }

    if (e.keyCode === 39) {
        e.preventDefault();
        e.stopPropagation();
        right(path, row, column);
    }
}, true);

let left = function(path, row, column) {
    let { cursorNode, cursorParentNode } = findNode(prog, row + 1, column);

    if (["Literal", "Identifier", "Parentheses", "StringLiteral"].indexOf(cursorNode.type) !== -1) {
        if (cursorNode.loc.start.column <= column - 1) {
            column -= 1;
            setCursor(row, column);
            return;
        }
    }
    
    // enter from the right
    if (cursorNode.type === "CallExpression") {
        if (cursorNode.loc.end.column === column) {
            column -= 1;
            setCursor(row, column);
            return;
        }
    }

    for (let i = path.length - 1; i > 0; i--) {
        let node = path[i];
        let parent = path[i - 1];

        let propName = findPropName(parent, node);

        if (propName === "right") {
            let loc = parent.left.loc;
            row = loc.end.line - 1;
            column = loc.end.column + 1;
            setCursor(row, column, true);
            hideCursor();
            break;
        } else if (propName === "init") {
            // TODO: check the type, if it's a placeholder then we need to select it
            let loc = parent.id.loc;
            row = loc.end.line - 1;
            column = loc.end.column;
            setCursor(row, column);
            break;
        } else if (propName === "property") {
            let loc = parent.object.loc;
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
        let elements = cursorParentNode.elements;
        let idx = elements.findIndex(element => cursorNode === element);

        if (idx > 0) {
            cursorNode = cursorParentNode.elements[idx - 1];
            column = cursorNode.loc.end.column; // assume same row
            setCursor(row, column);
        }
        return;
    }

    if (cursorParentNode.type === "FunctionExpression") {
        let params = cursorParentNode.params;
        let idx = params.findIndex(param => cursorNode === param);

        if (idx > 0) {
            cursorNode = cursorParentNode.params[idx - 1];
            column = cursorNode.loc.end.column; // assume same row
            setCursor(row, column);
        }
    }

    if (cursorParentNode.type === "CallExpression") {
        let args = cursorParentNode.arguments;
        let idx = args.findIndex(arg => cursorNode === arg);

        if (idx > 0) {
            cursorNode = cursorParentNode.arguments[idx - 1];
            column = cursorNode.loc.end.column; // assume same row
            setCursor(row, column);
        }
    }

    let nodes = findNode(prog, row + 1, column - 1);
    // we use cursorParentNode here because the identifier for the CallExpression
    // is smushed right up against the '(' so it's impossible to find it unless
    // we changed the the findNode method
    // TODO investigate adding an option to findNode to change whether the ranges are inclusive or not
    if (["CallExpression"].indexOf(nodes.cursorParentNode.type) !== -1) {
        column -= 1;
        setCursor(row, column);
        return;
    }
};

let right = function(path, row, column) {
    let { cursorNode, cursorParentNode } = findNode(prog, row + 1, column);

    if (["Literal", "Identifier", "Parentheses", "StringLiteral"].indexOf(cursorNode.type) !== -1) {
        if (column + 1 <= cursorNode.loc.end.column) {
            column += 1;
            setCursor(row, column);
            return;
        }
    }

    for (let i = path.length - 1; i > 0; i--) {
        let node = path[i];
        let parent = path[i-1];

        let propName = findPropName(parent, node);

        if (propName === "left") {
            let loc = parent.left.loc;
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
        } else if (propName === "object") {
            let loc = parent.property.loc;
            row = loc.end.line - 1;
            column = loc.start.column;
            setCursor(row, column);
            break;
        }
    }

    if (["BinaryExpression", "AssignmentExpression"].indexOf(cursorNode.type) !== -1) {
        column = cursorNode.right.loc.start.column;
        setCursor(row, column);
        return;
    }

    if (cursorParentNode.type === "ArrayExpression") {
        let elements = cursorParentNode.elements;
        let idx = elements.findIndex(element => cursorNode === element);

        if (idx < elements.length - 1) {
            cursorNode = cursorParentNode.elements[idx + 1];
            column = cursorNode.loc.start.column; // assume same row
            setCursor(row, column);
        }
        return;
    }
    
    if (cursorParentNode.type === "FunctionExpression") {
        let params = cursorParentNode.params;
        let idx = params.findIndex(param => cursorNode === param);
        
        if (idx < params.length - 1) {
            cursorNode = cursorParentNode.params[idx + 1];
            column = cursorNode.loc.start.column; // assume same row
            setCursor(row, column);
        }
    }

    if (cursorParentNode.type === "CallExpression") {
        let args = cursorParentNode.arguments;
        let idx = args.findIndex(arg => cursorNode === arg);

        if (idx < args.length - 1) {
            cursorNode = cursorParentNode.arguments[idx + 1];
            column = cursorNode.loc.start.column; // assume same row
            setCursor(row, column);
        }
    }

    let nodes = findNode(prog, row + 1, column + 1);
    if (["Parentheses", "CallExpression"].indexOf(nodes.cursorNode.type) !== -1) {
        column += 1;
        setCursor(row, column);
        return;
    }
};

module.exports = {
    init(aceEditor, ast) {
        editor = aceEditor;
        prog = ast;

        selection = editor.getSession().getSelection();
        session = editor.getSession();

        selection.on("changeCursor", e => {
            setTimeout(() => {
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
            }, 0);
        });
    }   
};
