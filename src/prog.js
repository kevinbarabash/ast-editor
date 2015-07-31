var prog = {
    type: "Program",
    body: [
        {
            type: "LineComment",
            content: "Single line comment"  // newlines are disallowed
        },
        {
            type: "BlockComment",
            content: "Block Comment\nLine 1\nLine 2"
        },
        {
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
        },
        {
            type: "ForOfStatement",
            left: {
                type: "Identifier",
                name: "a"
            },
            right: {
                type: "ArrayExpression",
                elements: [
                    { type: "Literal", raw: "1.0" },
                    { type: "Literal", raw: "2." },
                    { type: "Literal", raw: "3" },
                    { type: "Placeholder" }
                ]
            },
            body: {
                type: "BlockStatement",
                body: [
                    {
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
                    },
                    { type: "BlankStatement" },
                    {
                        type: "ReturnStatement",
                        argument: {
                            type: "Identifier",
                            name: "b"
                        }
                    }
                ]
            }
        },
        { type: "BlankStatement" },
        {
            type: "ClassDeclaration",
            id: {
                type: "Identifier",
                name: "Foo"
            },
            body: {
                type: "ClassBody",
                body: [
                    {
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
                                "body": [
                                    { type: "BlankStatement" }
                                ]
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
                                "body": [
                                    { type: "BlankStatement" }
                                ]
                            },
                            "generator": false,
                            "expression": false
                        },
                        kind: "constructor",
                        computed: false,
                        "static": false
                    }
                ]
            }
        }
    ]
};

module.exports = prog;
