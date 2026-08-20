<!--
The sections below are the ones this repository has actually needed. Delete
any that genuinely do not apply, and say why rather than deleting silently.

Nothing here asks you to prove your change is good. It asks what you did,
what ran, and what you are still unsure about. The last one is the most
useful section in this file.
-->

## What

<!-- One or two sentences. What changes for someone using this? -->

## Why

<!-- What was wrong, or what was missing. If a test, a run or an error
message led you here, quote it — evidence travels better than description. -->

## Evidence

<!-- What did you actually run? A CI run number, a failing test that now
passes, a command and its output. "Tests pass" is a claim; a run number is
evidence.

If you could not run something, say so. An honest gap is more useful than a
sentence that implies coverage you do not have. -->

## Security

<!-- Does this touch signing, verification, persistence, tokens, or the
attestation envelope? If yes, say what you checked.

If it touches the envelope, note whether the Python reference verifier and
the browser verifier still agree — a disagreement between implementations is
a finding even without an exploit. -->

## Limitations

<!-- What this does not do. What might break. What you are unsure about.

This section is not an admission of weakness. A change that names its own
edges is easier to review, easier to revert, and easier to build on. -->

## Checklist

- [ ] The pipeline is green, or I have said which stage fails and why
- [ ] Failure paths are tested, not only success paths
- [ ] Documentation touched by this change is updated in the same PR
- [ ] No secret, key, or token appears in the diff
- [ ] Anything I could not verify is named above rather than left implied
