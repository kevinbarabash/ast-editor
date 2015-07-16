var Immutable = require('immutable');

var map1 = Immutable.Map({a:1, b:2, c:3});
var map2 = map1.set('b', 50);
console.log(map1.get('b')); // 2
console.log(map2.get('b')); // 50

var map3 = map2.set('c', Immutable.Map({ x: 5, y: 10 }));
console.log(map3.get('c'));

var c1 = map3.get('c');
var c2 = c1.set('x', 25);
var map4 = map3.set('c', c2);

console.log(c1);
console.log(c2);

console.log(map3);
console.log(map4);
