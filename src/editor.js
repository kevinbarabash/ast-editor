let renderAST = require('./codegen.js').renderAST;
let findNode = require("./node_utils.js").findNode;
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


let selection = session.getSelection();
selection.on("changeCursor", e => {
    console.log(e);
    let range = editor.getSelectionRange();
    let line = range.start.row + 1;
    let column = range.start.column;
    console.log(`cursor at line ${line} and column ${column}`);
    let { cursorNode } = findNode(prog, line, column);
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


document.addEventListener('keypress', function (e) {
    //e.stopPropagation();
    e.preventDefault();
    //console.log("keypress: %o", e);
    let selection = editor.getSession().getSelection();
    let { row, column } = selection.getCursor();
    let line = row + 1;
    let { cursorNode } = findNode(prog, line, column);

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
