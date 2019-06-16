### Generate Credentials

```
node index.js gen 'registrations/*.json' --output-dir=output --layout=idcard --no-validate=true --log --warn
```

### Validate Credentials

```
node index.js val 'registrations/*.json' --output-dir=output --no-validate=true --log --warn
```

### Generate Athletes List

```
node index.js csv 'registrations/*.json' --output=output/credentials.csv --no-validate=true --log --warn
```
