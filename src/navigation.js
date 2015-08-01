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

let left = function(path, row, column) {
    let { cursorNode, cursorParentNode } = findNode(prog, row + 1, column);

    if (["Literal", "Identifier"].indexOf(cursorNode.type) !== -1) {
        if (cursorNode.loc.start.column <= column - 1) {
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
};

let right = function(path, row, column) {
    let { cursorNode, cursorParentNode } = findNode(prog, row + 1, column);

    if (["Literal", "Identifier"].indexOf(cursorNode.type) !== -1) {
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
        let elements = cursorParentNode.elements;
        let idx = elements.findIndex(element => cursorNode === element);

        if (idx < elements.length - 1) {
            cursorNode = cursorParentNode.elements[idx + 1];
            column = cursorNode.loc.start.column; // assume same row
            setCursor(row, column);
        }
        return;
    }
};
