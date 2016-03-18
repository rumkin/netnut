# Changelog

### v0.4.6
* Prevent equity `ifFalse` from producing output.
* Make `if` branches to be empty.
* Fix `if` command.
* Fix `print` command.
* Update `dump` command.

### v0.4.3
* Change candy template substitution from `{{` and `}}` to `((` and `))`. It
  solves yaml syntax conflict for inline objects. Now constructions
  like `prop: (( var_name ))` will work. And even: `prop: {prop: (( variable )) }`.
* Add `if` action.
* Add default filters: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `isTrue`, `isFalse`.
* Fix `task` command.
* Update `print` command.
* Fix `dump` command.

### v0.3.13
* Add inline attributes parser.
* Add `prompt` command.
* Add `print` command.
* Add `dump` command.
* Update `env` command to use attributes.
* Update session instance.

### v0.3.7

* Add deep object evaluation.
* Add path configuration with `package.json`.
* Add default layout:
    * `$CWD/netnut`
    * `config.netnut.dir` in `package.json`
    * environment variable NETNUT_PATH
    * cli argument `--dir`

    Note that plugins from package.json will be loaded relative
    to `package.json` dir.

### v0.3.4

* Add basic sessions.
* Add cli context configuration.
* Fix lookup algorithm.
* Update cli output on error.
* Update context assign order.
* Add session state flag `ended`.

### v0.2.3

* Add command line plugins loading.
* Add `package.json` plugins loading.
* Update appfile.
* Update package.json plugins's path resolving.
* Update plugins context.


### v0.1.3

* Fix ssh shell private key issue.
* Add `.app` file and shebang.
* Update tasks install_nodejs and install_hao.
* Rename `playbook` into `book`.
