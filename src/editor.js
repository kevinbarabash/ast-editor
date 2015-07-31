let renderAST = require('./codegen.js').renderAST;
let { findNode, findPropName, findNodePath } = require("./node_utils.js");
let prog = require("./prog.js");

require('./navigation.js');

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

let selection = editor.getSession().getSelection();

/**
 * 
 */
selection.on("changeCursor", e => {
    let range = editor.getSelectionRange();
    let line = range.start.row + 1;
    let column = range.start.column;
    let { cursorNode } = findNode(prog, line, column);
    if (cursorNode.type === "Placeholder") {
        let loc = cursorNode.loc;
        let row = loc.start.line - 1;
        selection.setSelectionRange({
            start: {row, column: loc.start.column},
            end: {row, column: loc.end.column}
        });
        hideCursor();
    } else {
        showCursor();
    }
});

/**
 * Render the AST and update the cursor location
 * @param row
 * @param column
 */
let update = function(row, column) {
    session.setValue(renderAST(prog));
    selection.setSelectionRange({
        start: { row, column },
        end: { row, column }
    });
};


document.addEventListener('keypress', function (e) {
    //e.stopPropagation();
    e.preventDefault();
    //console.log("keypress: %o", e);

    let range = editor.getSelectionRange();
    let row = range.end.row;
    let column = range.end.column;
    let line = row + 1;
    
    let { cursorNode, cursorParentNode } = findNode(prog, line, column);

    if (!cursorNode) {
        return;
    }
    
    let c = String.fromCharCode(e.keyCode);

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
            let idx = -1;
            let elements = parent.elements;

            elements.forEach((element, index) => {
                if (expression === element) {
                    idx = index;
                }
            });
            if (idx !== -1) {
                let node = {
                    type: "Placeholder"
                };
                elements.splice(idx + 1, 0, node);
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
        } else if (/[a-zA-Z_$]/.test(c)) {
            node = {
                type: "Identifier",
                name: c
            };
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
        if (/[0-9\.]/.test(c)) {
            cursorNode.type = "Literal";
            if (c === ".") {
                cursorNode.raw = "0.";
                column += 1;
            } else {
                cursorNode.raw = c;
            }
        } else if (/[a-zA-Z_$]/.test(c)) {
            cursorNode.type = "Identifier";
            cursorNode.name = c;
        } else if (/[\(\)]/.test(c)) {
            cursorNode.type = "Parentheses";
            cursorNode.expression = {
                type: "Placeholder"
            };
            column += 1;
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
            let left = JSON.parse(JSON.stringify(cursorNode));
            cursorNode.type = "BinaryExpression";
            cursorNode.left = left;
            cursorNode.right = { type: "Placeholder" };
            cursorNode.operator = c;
            column += 3;
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
            cursorNode.type = "ExpressionStatement";
            cursorNode.expression = {
                type: "Identifier",
                name: c
            };
            column += 1;
            update(row, column);
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
