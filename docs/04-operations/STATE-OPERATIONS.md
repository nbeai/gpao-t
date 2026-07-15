# Native State Operations

The Native Runtime stores its isolated local state in `~/.gpao-t-next` by
default. It never uses the live GPAO-T state directory.

## Stored Data

- `runtime.sqlite`: commands, receipts, progress records, and integrity events.
- `owner.token`: local runtime ownership secret, mode `0600`.
- `snapshots/`: local state snapshots, including the owner token, mode `0700`.

Snapshots are local recovery artifacts. They must be kept private because they
contain the local ownership token. No provider credential is currently stored
by the native foundation.

## Safe Operations

Stop the runtime before changing saved state.

```sh
node src/index.js snapshot --state-dir "$HOME/.gpao-t-next" --label before-update
node src/index.js migrate --state-dir "$HOME/.gpao-t-next"
node src/index.js restore --state-dir "$HOME/.gpao-t-next" --snapshot <snapshot-directory>
```

Restore first creates a `pre-restore` safety snapshot. Migration first creates
a `pre-migration` safety snapshot when state already exists. Both operations
refuse to run while the runtime lock is present.

## Local Configuration

`GPAO_T_STATE_DIR` is optional and changes only the isolated native state
location. It is not a credential and should never point to the live GPAO-T
state path.
