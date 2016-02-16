/*
 * Simple Arithmetics Grammar
 * ==========================
 *
 * Accepts expressions like "2 * (3 + 4)" and computes their value.
 */

{
	function T(type, value) {
        return {
        	type:type, value:value
        };
    }

    function TT(type, value_) {
    	var value = value_ || {};
        value.type = type;

        return value;
    }

    function rest(array, index) {
    	if (! Array.isArray(array)) {
        	return;
        }

        return array.map(item => item[index]);
    }

    function restr(array, indexes) {
    	if (! Array.isArray(array)) {
        	return;
        }

        if (indexes.length > 1) {
        	return array.map(item => restr(item, indexes.slice(1)))
        }
        return array.map(item => item[indexes[0]]);
    }

    function concat(array) {
    	return Array.prototype.concat.apply([], array);
    }
}


Line
	= (Substitution/Text)*

Substitution
    = SubStart _* expr:Selector _* SubEnd { return TT('expression', {expr: expr}) }

Text
	= (Char)+ { return text() }

Char
    = "\\\\"
    / "\\" SubStart
    / !SubStart .

SubStart "Substitution start"
	= "(("

SubEnd "Substitution end"
	= "))"
_
  = " "
  / "\t"

Selector
	= value:Value filter:(_* "|" _* Filter)* _* { return TT('expression', {value: value, filters:rest(filter, 3)}); }

Variable
    = name:Varname path:(_* Property)* { return TT('variable', {name: name, path:rest(path, 1)}); }

Varname
	= [a-zA-Z_$] [a-zA-Z0-9_$]* { return text(); }

Property
    = "[" index:(Value) "]" { return T('index', index) }
    / "." name:Varname { return T('property', name) }

Filter
    = name:Varname args:(_+ Value)* { return TT('filter', {name:name, args: rest(args, 1)}); }

Value
    = value:Number
    / String
    / Variable
    / Boolean

Number
    = left:Integer "." right:Digit+ { return T('float', left + '.' + right) }
    / Integer { return T('integer', text()); }

Integer
	= head:Digit+ tail:("_" Digit+)* { return head + concat(rest(tail, 1)).join('');  }

Digit
	= [0-9]

Boolean
	= "true" { return T('bool', text()); }
    / "false" { return T('bool', text()); }

String
    = string:SingleQuoteString { return T('string', string); }
    / string:DoubleQuoteString { return T('string', string); }

SingleQuoteString
    = "'" text:SingleQuoteStringChar+ "'" { return rest(text, 1).join(''); }

SingleQuoteStringChar
	= "\\'"
	/ EscapeStringChar
    / !"'" .

DoubleQuoteString
    = '"' text:DoubleQuoteStringChar+ '"' { return rest(text, 1).join(''); }

DoubleQuoteStringChar
    = '\\"'
    / EscapeStringChar
    / !'"' .

EscapeStringChar
    = "\\"
    / "\\t"
    / "\\s"
    / "\\v"
    / "\\n"
