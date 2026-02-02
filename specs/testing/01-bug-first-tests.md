# Bug-First Testing Specification

## 1. Intent

Bug-first testing exists to ensure that every test in the suite provides a documented, verifiable defense against a specific, realistic regression or programming error. It prevents the systemic failure of "silent test rot," where test suites grow in size and execution time without increasing the actual reliability or fault-detection capability of the codebase. It eliminates vacuous coverage that satisfies metrics without constraining behavior against likely faults.

## 2. Definition of Bug-First

"Bug-first" testing is a methodology where a test is defined by the specific failure state it is designed to detect. A test is a formal constraint that renders a specific bug impossible to introduce without a corresponding test failure.

### What Bug-First Is Not
* It is not "Happy Path" testing (verifying only that code works when given correct input).
* It is not Coverage-Driven testing (writing tests to increase percentage metrics).
* It is not Refactoring-Safety testing (verifying that internal implementation details remain unchanged).
* It is not Fuzzing or Property-Based testing (though these may be used to discover bugs for which bug-first tests are then written).

## 3. Normative Rules

### Preconditions for Writing a Test
* A test MUST NOT be written unless a corresponding bug has been identified or hypothesized.
* The identified bug MUST be a realistic programming mistake (e.g., logical error, boundary condition, incorrect state transition).

### Scope and Specificity
* One test MUST target exactly one bug.
* Tests SHOULD be as granular as possible to ensure that a failure points directly to the cause.
* Tests MUST NOT assert behaviors that are incidental to the bug being prevented.

## 4. Required Test Metadata

Every test MUST include metadata (via annotations, docstrings, or structured comments) containing the following fields:

* **Bug Description**: A clear, concise description of the bug being prevented.
* **Failure Cause**: Identification of the specific code change (mutation) that would trigger this bug.
* **Prevented Behavior**: The specific incorrect outcome or side effect that the test prevents.

## 5. Test Validity Criteria

### Behavior Constraint
A test is valid only if it constrains the production code in a way that prevents the execution of the named bug. If the code can be modified to exhibit the bug while the test remains passing, the test is invalid.

### Mutation Failure
A test MUST fail if a realistic mutation (as defined in Section 6) representing its target bug is introduced. A test that passes under its corresponding mutation is vacuous and MUST be removed.

### Redundancy
A test is redundant if its target bug is already fully prevented by an existing, more granular test. Redundant tests SHOULD NOT exist as they increase maintenance burden without adding defense.

## 6. Mutation Verification Requirement

Mutation verification is the mandatory validation process for every test.

### Verification Process
1. Introduce a single, localized mutation into the production code that represents the bug the test is intended to prevent.
2. Execute the test. The test MUST fail.
3. Revert the mutation.
4. Execute the test suite. The test suite MUST pass.

### Rejection Criteria
* If a test passes when the corresponding mutation is present, the test is REJECTED.
* If a test fails for reasons unrelated to the introduced mutation (e.g., environment issues, unrelated side effects), the test is REJECTED.
* If multiple tests fail because of a single mutation, the tests SHOULD be evaluated for redundancy.

## 7. Prohibited Tests

The following test categories are strictly prohibited:

* **Happy-path-only tests**: Tests that only verify correct behavior without explicitly defending against failure modes.
* **"No crash" tests**: Tests that pass simply because the code did not throw an exception, without asserting specific outcomes.
* **Coverage-driven tests**: Tests written primarily to satisfy code coverage requirements.
* **Tests without a named bug**: Any test lacking the mandatory metadata defined in Section 4.
* **Tests unverified by mutation**: Any test that has not passed the mutation verification process defined in Section 6.

## 8. Failure Modes Prevented

This specification exists to prevent the following failure modes in the test suite and repository:

* **False Sense of Security**: High coverage metrics hiding a lack of actual fault detection.
* **Brittle Tests**: Tests that fail during refactoring despite the external behavior remaining correct (and bug-free).
* **Bloated Test Suites**: Excessive execution time caused by redundant or low-value tests.
* **Unclear Intent**: Developers being unable to determine why a specific test exists or what it is protecting.
* **Zombie Tests**: Tests that continue to pass even if the logic they supposedly verify is completely removed or broken.
