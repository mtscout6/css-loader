var should = require("should");
var path = require("path");
var cssLoader = require("../index.js");
var vm = require("vm");

function test(name, input, result, query, modules) {
	it(name, function() {
		var output = cssLoader.call({
			loaders: [{request: "loader"}],
			loaderIndex: 0,
			resource: "test.css",
			query: query
		}, input);
		assetEvaluated(output, result, modules);
	});
}

function testMinimize(name, input, result, query, modules) {
	it(name, function() {
		var output = cssLoader.call({
			loaders: [{request: "loader"}],
			loaderIndex: 0,
			resource: "test.css",
			minimize: true,
			query: query
		}, input);
		assetEvaluated(output, result, modules);
	});
}

function assetEvaluated(output, result, modules) {
	try {
		var fn = vm.runInThisContext("(function(module, exports, require) {" + output + "})", "testcase.js");
		var m = { exports: {}, id: 1 };
		fn(m, m.exports, function(module) {
			if(module === require.resolve("../mergeImport"))
				return require("../mergeImport");
			if(module === require.resolve("../cssToString"))
				return require("../cssToString");
			if(module.indexOf("-!loader!") === 0)
				module = module.substr(9);
			if(modules && modules[module])
				return modules[module];
			return "{" + module + "}";
		});
	} catch(e) {
		console.error(output);
		throw e;
	}
	delete m.exports.toString;
	m.exports.should.be.eql(result);

}

describe("url", function() {
	test("empty", "", [
		[1, "", ""]
	]);
	testMinimize("empty minimized", "", [
		[1, "", ""]
	]);
	test("simple", ".class { a: b c d; }", [
		[1, ".class { a: b c d; }", ""]
	]);
	test("simple2", ".class { a: b c d; }\n.two {}", [
		[1, ".class { a: b c d; }\n.two {}", ""]
	]);
	test("import", "@import url(test.css);\n.class { a: b c d; }", [
		[2, ".test{a: b}", ""],
		[1, "\n.class { a: b c d; }", ""]
	], "", {
		"./test.css": [[2, ".test{a: b}", ""]]
	});
	test("import 2", "@import url('test.css');\n.class { a: b c d; }", [
		[2, ".test{a: b}", "screen"],
		[1, "\n.class { a: b c d; }", ""]
	], "", {
		"./test.css": [[2, ".test{a: b}", "screen"]]
	});
	test("import with media", "@import url('~test/css') screen and print;\n.class { a: b c d; }", [
		[3, ".test{a: b}", "((min-width: 100px)) and (screen and print)"],
		[2, ".test{c: d}", "screen and print"],
		[1, "\n.class { a: b c d; }", ""]
	], "", {
		"test/css": [
			[3, ".test{a: b}", "(min-width: 100px)"],
			[2, ".test{c: d}", ""]
		]
	});
	test("import external", "@import url(http://example.com/style.css);\n@import url(\"//example.com/style.css\");", [
		[1, "@import url(http://example.com/style.css);", ""],
		[1, "@import url(//example.com/style.css);", ""],
		[1, "\n", ""]
	]);
	test("background img", ".class { background: green url( \"img.png\" ) xyz }", [
		[1, ".class { background: green url( {./img.png} ) xyz }", ""]
	]);
	test("background img 2", ".class { background: green url(~img/png) url(aaa) xyz }", [
		[1, ".class { background: green url({img/png}) url({./aaa}) xyz }", ""]
	]);
	test("background img 3", ".class { background: green url( 'img.png' ) xyz }", [
		[1, ".class { background: green url( {./img.png} ) xyz }", ""]
	]);
	test("background img absolute", ".class { background: green url(/img.png) xyz }", [
		[1, ".class { background: green url(/img.png) xyz }", ""]
	]);
	test("background img absolute with root", ".class { background: green url(/img.png) xyz }", [
		[1, ".class { background: green url({./img.png}) xyz }", ""]
	], "?root=.");
	test("background img external",
		".class { background: green url(data:image/png;base64,AAA) url(http://example.com/image.jpg) url(//example.com/image.png) xyz }", [
		[1, ".class { background: green url(data:image/png;base64,AAA) url(http://example.com/image.jpg) url(//example.com/image.png) xyz }", ""]
	]);
	test("background img external data",
		".class { background: url(\"data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 42 26' fill='%23007aff'><rect width='4' height='4'/><rect x='8' y='1' width='34' height='2'/><rect y='11' width='4' height='4'/><rect x='8' y='12' width='34' height='2'/><rect y='22' width='4' height='4'/><rect x='8' y='23' width='34' height='2'/></svg>\") }", [
		[1, ".class { background: url(\"data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 42 26' fill='%23007aff'><rect width='4' height='4'/><rect x='8' y='1' width='34' height='2'/><rect y='11' width='4' height='4'/><rect x='8' y='12' width='34' height='2'/><rect y='22' width='4' height='4'/><rect x='8' y='23' width='34' height='2'/></svg>\") }", ""]
	]);
	test("background img data url",
		".class { background-image: url(\"data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxIDEiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiPjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmMDAwMCIvPjxzdG9wIG9mZnNldD0iMzAlIiBzdG9wLWNvbG9yPSIjMDA4MDAwIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDAwMGZmIi8+PC9saW5lYXJHcmFkaWVudD48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSJ1cmwoI2dyYWRpZW50KSIgLz48L3N2Zz4=\") }", [
		[1, ".class { background-image: url(\"data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxIDEiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiPjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmMDAwMCIvPjxzdG9wIG9mZnNldD0iMzAlIiBzdG9wLWNvbG9yPSIjMDA4MDAwIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDAwMGZmIi8+PC9saW5lYXJHcmFkaWVudD48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSJ1cmwoI2dyYWRpZW50KSIgLz48L3N2Zz4=\") }", ""]
	]);
	test("filter hash",
		".highlight { filter: url(#highlight); }", [
		[1, ".highlight { filter: url(#highlight); }", ""]
	]);
	test("filter hash quotation marks",
		".highlight { filter: url('#line-marker'); }", [
		[1, ".highlight { filter: url('#line-marker'); }", ""]
	]);
	test("font face", "@font-face { src: url(regular.woff) format('woff'), url(~truetype/regular.ttf) format('truetype') }", [
		[1, "@font-face { src: url({./regular.woff}) format('woff'), url({truetype/regular.ttf}) format('truetype') }", ""]
	]);
	test("media query", "@media (min-width: 500px) { body { background: url(image.png); } }", [
		[1, "@media (min-width: 500px) { body { background: url({./image.png}); } }", ""]
	]);
	testMinimize("minimized simple", ".class { a: b c d; }", [
		[1, ".class{a:b c d}", ""]
	]);
});
