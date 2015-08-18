class ASTEditor {
    constructor(ast) {
        this.ast = ast;
        this.row = 0;
        this.col = 0;
    }
    
    insert(c) {
        throw new Error("'editing' mixin required");
    }
    
    backspace() {
        throw new Error("'editing' mixin required");
    }
    
    enter() {
        throw new Error("'editing' mixin required");
    }
    
    left() {
        throw new Error("'navigation' mixin required");
    }
    
    right() {
        throw new Error("'navigation' mixin required");
    }
    
    setCursor(row, column, isPlaceholder) {
        throw new Error("mixin is missing");
    }
    
    update() {
        throw new Error("mixin is missing");
    }
    
    renderAST() {
        throw new Error("'codegen' mixin require");
    }
}

module.exports = ASTEditor;
