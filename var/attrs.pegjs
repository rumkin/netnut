/*
 * Simple Attributes Parser
 * ==========================
 *
 * Accept space separated attributes line with literal support and C-Strings.
 * Example:
 * user=some-user-name message="Hello world" n=10 has-value=true
 */
{
	function rest(array, i) {
    	return array.map(item => item[i]);
    }
}

Params
	= _* attrs:(Attr _*)* EOF { return rest(attrs, 0); }

Attr
	= name:AttrName _* "=" _* value:AttrValue { return {name, value}; }
    / name:AttrName { return {name:text(), value: true}; }

AttrName
	= [A-Za-z_$] [A-Za-z0-9_.$-]* { return text(); }

AttrValue
    = Number
    / Boolean
    / String

Number
	= Integer
    / Float

Integer = Digits { return parseInt(text(), 10); }
Float = Digits '.' Digits { return parseFloat(text(), 10); }

Boolean
	= "false" { return false; }
    / "true" { return true; }

String
	= QuotedString
	/ Word

Word
	= ch:(!_ .)+ { return text(); }

Digits = [0-9]+ { return text(); }

QuotedString
    = '"' string:QuotedStringChar* '"' { return rest(string, 1).join(''); }

QuotedStringChar
    = '\\\\'
    / '\\"'
    / !'"' .

_
	= " "
    / "\t"

EOF
    = !.
