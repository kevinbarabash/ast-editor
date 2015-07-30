

let cursorNode = null;
let cursorParentNode = null;

function _findNode(node, parent, line, column) {
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
                        _findNode(child, node, line, column);
                    }
                }
                _findNode(value, node, line, column);
            }
        }
    }
}

function findNode(root, line, column) {
    cursorNode = null;
    cursorParentNode = null;
    
    _findNode(root, null, line, column);
    
    return { cursorNode, cursorParentNode };
}

module.exports = {
    findNode
};
