let renderAST = require('./codegen.js').renderAST;
let findNode = require("./node_utils.js").findNode;
let prog = require("./prog.js");

document.addEventListener('keydown', function (e) {
    let session = editor.getSession();
    let selection = session.getSelection();

    // prevent backspace
    if (e.keyCode === 8) {
        e.stopPropagation();
        e.preventDefault();
        let range = editor.getSelectionRange();
        let row = range.end.row;
        let column = range.end.column;
        let line = row + 1;
        let { cursorNode, cursorParentNode } = findNode(prog, line, column);

        if (cursorNode) {
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
        let { cursorNode, cursorParentNode } = findNode(prog, line, column);
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
        let { cursorNode, cursorParentNode } = findNode(prog, line, column);
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
