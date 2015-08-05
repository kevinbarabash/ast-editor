var expect = require("expect.js");
var assert = require("assert");
let { left, right } = require("../src/navigation.js");
let { insert, backspace, enter } = require("../src/editing.js");
let { findNodePath } = require("../src/node_utils.js");
let { renderAST } = require("../src/codegen.js");

let row, col, ast;

let update = function(r, c) {
    row = r;
    col = c;
};

describe("AST Editor", function () {

    describe("Insert", function () {
        it("should pass", function () {
            expect(true).to.be(true);
        });
        
        describe("inside a Placeholder", function () {
            beforeEach(function () {
                ast = {
                    type: "Program",
                    body: [
                        { type: "Placeholder" }
                    ]
                };
                renderAST(ast); // render it once to add in location information

                row = 0;
                col = 1;    
                // because when something is selected we put the cursor at the end
                // TODO change this and put it at the start so that the length 
                // of the object doesn't have an affect of how much to increment
                // column by
            });
            
            it("should create an identifier", function () {
                insert('a', row, col, update, ast);
                assert.equal(renderAST(ast), "a\n");
                assert.equal(row, 0);
                assert.equal(col, 1);
            });
            
            it("should create a number literal using a number", function () {
                insert('1', row, col, update, ast);
                assert.equal(renderAST(ast), "1\n");
                assert.equal(row, 0);
                assert.equal(col, 1);
            });
            
            it("should create a number literal using a decimal", function () {
                insert('.', row, col, update, ast);
                assert.equal(renderAST(ast), "0.\n");
                assert.equal(row, 0);
                assert.equal(col, 2);
            });

            it("should create a string literal using a decimal", function () {
                insert('"', row, col, update, ast);
                assert.equal(renderAST(ast), '""\n');
                assert.equal(row, 0);
                assert.equal(col, 1);
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
                renderAST(ast); // render it once to add in location information
            });
            
            it("should insert letters at the beginning", function () {
                row = 0;
                col = 0;
                // TODO we should only need insert("a")
                insert("a", row, col, update, ast);
                assert.equal(renderAST(ast), "ahello;\n");
                assert.equal(row, 0);
                assert.equal(col, 1);
            });

            it("should insert letters at the end", function () {
                row = 0;
                col = 5;
                // TODO we should only need insert("a")
                insert("a", row, col, update, ast);
                assert.equal(renderAST(ast), "helloa;\n");
                assert.equal(row, 0);
                assert.equal(col, 6);
            });

            it("should insert letters in the middle", function () {
                row = 0;
                col = 2;
                // TODO we should only need insert("a")
                insert("a", row, col, update, ast);
                assert.equal(renderAST(ast), "heallo;\n");
                assert.equal(row, 0);
                assert.equal(col, 3);
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

    });

});