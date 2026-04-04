const parser = require('@solidity-parser/parser');

const input = `
contract SecureVault {
    function deposit() public payable {
        _balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
}
`;

try {
    const ast = parser.parse(input);
    parser.visit(ast, {
        EmitStatement: (node) => {
            console.log('Found EmitStatement');
        },
        ExpressionStatement: (node) => {
           console.log('Found ExpressionStatement');
        }
    });
} catch (e) {
    console.error(e);
}
