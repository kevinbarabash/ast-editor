var expect = require("expect.js");
var assert = require("assert");
let ASTEditor = require("../src/ast-editor.js");
let { left, right } = require("../src/navigation.js");
let { insert, backspace, enter } = require("../src/editing.js");
let { renderAST, astWatcher } = require("../src/codegen.js");

let row, col, ast;

describe("AST Editor", function () {
    let astEditor;
    
    beforeEach(function () {
        astEditor = new ASTEditor();
        astEditor.update = function(r, c) {
            this.row = r;
            this.col = c;
        }.bind(astEditor);
        astEditor.setCursor = function(r, c) {
            this.row = r;
            this.col = c;
        }.bind(astEditor);
        astEditor.updateCursor = function() {};
        astEditor.showCursor = function() {};
        astEditor.hideCursor = function() {};
    });

    describe("Insert", function () {
        describe("inside a Placeholder", function () {
            beforeEach(function () {
                ast = {
                    type: "Program",
                    body: [
                        { type: "Placeholder" }
                    ]
                };
                astEditor.ast = ast;
                renderAST(ast); // render it once to add in location information

                astEditor.row = 0;
                astEditor.col = 1;    
                // because when something is selected we put the cursor at the end
                // TODO change this and put it at the start so that the length 
                // of the object doesn't have an affect of how much to increment
                // column by
            });
            
            it("should create an identifier", function () {
                astEditor.insert('a');
                assert.equal(renderAST(ast), "a\n");
                assert.equal(astEditor.row, 0);
                assert.equal(astEditor.col, 1);
            });
            
            it("should create a number literal using a number", function () {
                astEditor.insert('1');
                assert.equal(renderAST(ast), "1\n");
                assert.equal(astEditor.row, 0);
                assert.equal(astEditor.col, 1);
            });
            
            it("should create a number literal using a decimal", function () {
                astEditor.insert('.');
                assert.equal(renderAST(ast), "0.\n");
                assert.equal(astEditor.row, 0);
                assert.equal(astEditor.col, 2);
            });

            it("should create a string literal using a decimal", function () {
                astEditor.insert('"');
                assert.equal(renderAST(ast), '""\n');
                assert.equal(astEditor.row, 0);
                assert.equal(astEditor.col, 1);
            });
        });
        
        describe("inside an Identifier", function () {
            beforeEach(function () {
                ast = {
                    type: "Program",
                    body: [
                        {
                            type: "ExpressionStatement",
                            expression: {
                                type: "Identifier",
                                name: "hello"
                            }
                        }
                    ]
                };
                astEditor.ast = ast;
                renderAST(ast); // render it once to add in location information
            });
            
            it("should insert letters at the beginning", function () {
                astEditor.row = 0;
                astEditor.col = 0;
                astEditor.insert("a");
                assert.equal(renderAST(ast), "ahello;\n");
                assert.equal(astEditor.row, 0);
                assert.equal(astEditor.col, 1);
            });

            it("should insert letters at the end", function () {
                astEditor.row = 0;
                astEditor.col = 5;
                astEditor.insert("a");
                assert.equal(renderAST(ast), "helloa;\n");
                assert.equal(astEditor.row, 0);
                assert.equal(astEditor.col, 6);
            });

            it("should insert letters in the middle", function () {
                astEditor.row = 0;
                astEditor.col = 2;
                astEditor.insert("a");
                assert.equal(renderAST(ast), "heallo;\n");
                assert.equal(astEditor.row, 0);
                assert.equal(astEditor.col, 3);
            });
        });

        describe("inside a StringLiteral", function () {

        });

        describe("inside a NumberLiteral", function () {

        });

        describe("inside an Expression", function () {

        });

        describe("inside an Array", function () {
            
        });
        
        describe("inside a parameter list", function () {
            
        });

        describe("inside a argument list", function () {

        });

        describe("opening Parentheses", function () {

        });
        
        describe("closing Parentheses", function () {

        });
        
        describe("opening Bracket", function () {
            
        });
        
        describe("closing Bracket", function () {
            
        });
    });

    describe("Backspace", function () {
        
    });

    describe("Enter", function () {

    });

    describe("Left/Right", function () {
        describe("navigating an array", function () {
            beforeEach(function () {
                var elements = [
                    { 
                        type: "Literal",
                        raw: "1.0"
                    },
                    {
                        type: "StringLiteral",
                        value: "a"
                    },
                    { 
                        type: "Identifier",
                        name: "b"
                    },
                    {
                        type: "Placeholder"
                    }
                ];
                ast = {
                    type: "Program",
                    body: [
                        {
                            type: "ExpressionStatement",
                            expression: {
                                type: "ArrayExpression",
                                elements: elements
                            }
                        }
                    ]
                };
                astEditor.ast = ast;
                renderAST(ast); // render it once to add in location information
            });
            
            it("can navigate right", function () {
                // [1.0, "a", b, ?]
                
                astEditor.row = 0;
                astEditor.col = 4;
                astEditor.right();
                assert.equal(astEditor.col, 6);
                
                astEditor.col = 9;
                astEditor.right();
                assert.equal(astEditor.col, 11);
                
                astEditor.col = 12;
                astEditor.right();
                assert.equal(astEditor.col, 14);
            });

            it("can navigate left", function () {
                astEditor.col = 14;
                astEditor.left();
                assert.equal(astEditor.col, 12);
                
                astEditor.col = 11;
                astEditor.left();
                assert.equal(astEditor.col, 9);
                
                astEditor.row = 0;
                astEditor.col = 6;
                astEditor.left();
                assert.equal(astEditor.col, 4);
            });
        });
        
        describe("navigating a function call", function () {
            beforeEach(function () {
                var args = [
                    {
                        type: "Literal",
                        raw: "1.0"
                    },
                    {
                        type: "StringLiteral",
                        value: "a"
                    },
                    {
                        type: "Identifier",
                        name: "b"
                    },
                    {
                        type: "Placeholder"
                    }
                ];
                ast = {
                    type: "Program",
                    body: [
                        {
                            type: "ExpressionStatement",
                            expression: {
                                type: "CallExpression",
                                callee: {
                                    type: "Identifier",
                                    name: "foo"
                                },
                                arguments: args
                            }
                        }
                    ]
                };
                astEditor.ast = ast;
                renderAST(ast); // render it once to add in location information
            });

            it("can navigate right with arguments", function () {
                // foo(1.0, "a", b, ?);

                astEditor.row = 0;
                astEditor.col = 7;
                astEditor.right();
                assert.equal(astEditor.col, 9);

                astEditor.col = 12;
                astEditor.right();
                assert.equal(astEditor.col, 14);

                astEditor.col = 15;
                astEditor.right();
                assert.equal(astEditor.col, 17);
            });
            
            it("can navigate left within arguments", function () {
                astEditor.row = 0;
                astEditor.col = 17;
                astEditor.left();
                assert.equal(astEditor.col, 15);

                astEditor.row = 0;
                astEditor.col = 18;
                astEditor.left();
                assert.equal(astEditor.col, 15);
                
                astEditor.col = 14;
                astEditor.left();
                assert.equal(astEditor.col, 12);

                astEditor.col = 9;
                astEditor.left();
                assert.equal(astEditor.col, 7);
            });
            
            it("can navigate from callee to arguments", function () {
                 
            });
            
            it("can navigate from arguments to callee", function () {
                
            });
        });
        
        describe("navigating computed props", function () {
            
        });
        
        describe("navigating regular props", function () {
             
        });
    });

});