#!/usr/bin/env node
/**
 * Xcode 26 / Swift 6.2 cannot compile stock expo-modules-jsi 57.1.0:
 * `weak let`, SWIFT_RETURNS_RETAINED on RuntimeScheduler constructors, and
 * sending raw JSI pointers into @JavaScriptActor closures.
 * Run after install so `expo run:ios` can compile.
 * See https://github.com/expo/expo/issues/50067
 */
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const WEAK_LET = "weak let ";
const WEAK_VAR = "weak var ";

const SCHEDULER_PUBLIC = `public:
  /**
   Constructs a scheduler bound to a host-provided native RuntimeScheduler.`;

const SCHEDULER_GUARD = `public:
  // Xcode 27 (clang build 18xxxxxx+) warns when the constructors of a
  // SWIFT_SHARED_REFERENCE type are not annotated; Xcode 26.x (Swift 6.2)
  // rejects the annotation on constructors as an error. Apply it only on
  // toolchains that understand it. See https://github.com/expo/expo/issues/50067
#if defined(__apple_build_version__) && __apple_build_version__ >= 18000000
#define EXPO_RUNTIME_SCHEDULER_CTOR_RETAINED SWIFT_RETURNS_RETAINED
#else
#define EXPO_RUNTIME_SCHEDULER_CTOR_RETAINED
#endif
  /**
   Constructs a scheduler bound to a host-provided native RuntimeScheduler.`;

const UNSAFE_BOX = `internal import ExpoModulesJSI_Cxx
import Foundation
internal import jsi

/// Carries a call-scoped raw pointer into the \`@JavaScriptActor\` closures below.
///
/// Upstream marks these locals \`nonisolated(unsafe)\`, which Swift 6.3 accepts but
/// Swift 6.2.x still rejects with "sending 'ptr' risks causing data races". A
/// \`@unchecked Sendable\` box is exempt from region checking on both compilers.
/// See https://github.com/expo/expo/issues/50067
internal struct UnsafeSendableBox<Value>: @unchecked Sendable {
  let value: Value
  @inline(__always)
  init(_ value: Value) {
    self.value = value
  }
}
`;

function walk(dir, visit) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === ".DerivedData" || entry.name === ".build" || entry.name === ".swiftpm" || entry.name === "Products") {
      continue;
    }
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, visit);
    else visit(path);
  }
}

function findPackages(root, packageName) {
  const found = [];
  const direct = join(root, packageName);
  try {
    readdirSync(direct);
    found.push(direct);
  } catch {
    // missing
  }
  const pnpm = join(root, ".pnpm");
  let entries;
  try {
    entries = readdirSync(pnpm, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(`${packageName}@`)) continue;
    found.push(join(pnpm, entry.name, "node_modules", packageName));
  }
  return found;
}

function patchFile(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) return false;
  writeFileSync(path, after);
  return true;
}

function patchWeakLet(path) {
  return patchFile(path, (src) => src.replaceAll(WEAK_LET, WEAK_VAR));
}

function patchRuntimeScheduler(path) {
  return patchFile(path, (src) => {
    let next = src;
    if (!next.includes("EXPO_RUNTIME_SCHEDULER_CTOR_RETAINED") && next.includes("SWIFT_RETURNS_RETAINED RuntimeScheduler")) {
      next = next.replace(SCHEDULER_PUBLIC, SCHEDULER_GUARD);
    }
    next = next.replaceAll("SWIFT_RETURNS_RETAINED RuntimeScheduler", "EXPO_RUNTIME_SCHEDULER_CTOR_RETAINED RuntimeScheduler");
    return next;
  });
}

function patchSendableRuntimeClasses(path) {
  return patchFile(path, (src) => {
    let next = src;
    next = next.replace(
      "public final class JavaScriptError: Error, Sendable {",
      "public final class JavaScriptError: Error, @unchecked Sendable {",
    );
    next = next.replace(
      "public final class JavaScriptValue: JavaScriptType, Equatable, Escapable {",
      "public final class JavaScriptValue: JavaScriptType, Equatable, Escapable, @unchecked Sendable {",
    );
    next = next.replace(
      "public final class JavaScriptPropNameID: JavaScriptType {",
      "public final class JavaScriptPropNameID: JavaScriptType, @unchecked Sendable {",
    );
    return next;
  });
}

function patchJavaScriptRuntime(path) {
  return patchFile(path, (src) => {
    let next = src;
    if (!next.includes("struct UnsafeSendableBox")) {
      next = next.replace(
        `internal import ExpoModulesJSI_Cxx
import Foundation
internal import jsi
`,
        UNSAFE_BOX,
      );
    }

    next = next.replace(
      `      nonisolated(unsafe) let resultPtr = resultPtr

      return withGuaranteedContext(context) { (context: HostObjectContext, runtime) in
        return JavaScriptActor.assumeIsolated {
          return forwardingSwiftErrorsToJS(runtime: runtime) {
            try context.get(propertyName).writeJSIValue(to: resultPtr)
`,
      `      let resultPtr = UnsafeSendableBox(resultPtr)

      return withGuaranteedContext(context) { (context: HostObjectContext, runtime) in
        return JavaScriptActor.assumeIsolated {
          return forwardingSwiftErrorsToJS(runtime: runtime) {
            try context.get(propertyName).writeJSIValue(to: resultPtr.value)
`,
    );

    next = next.replace(
      `    nonisolated(unsafe) let thisPtr = thisPtr
    nonisolated(unsafe) let argumentsPtr = argumentsPtr
    nonisolated(unsafe) let resultPtr = resultPtr

    // See \`withGuaranteedContext\` for why neither the context nor the runtime is retained here, and
    // why the result is written to the caller's slot instead of being returned.
    return withGuaranteedContext(context) { (context: HostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let this = UnsafeMutablePointer(mutating: thisPtr).move()
          let arguments = JavaScriptValuesBuffer(runtime, start: argumentsPtr, count: argumentsCount)
          let thisValue = JavaScriptValue(runtime, this)
          try context.call(thisValue, consume arguments).writeJSIValue(to: resultPtr)
`,
      `    let thisPtr = UnsafeSendableBox(thisPtr)
    let argumentsPtr = UnsafeSendableBox(argumentsPtr)
    let resultPtr = UnsafeSendableBox(resultPtr)

    // See \`withGuaranteedContext\` for why neither the context nor the runtime is retained here, and
    // why the result is written to the caller's slot instead of being returned.
    return withGuaranteedContext(context) { (context: HostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let this = UnsafeMutablePointer(mutating: thisPtr.value).move()
          let arguments = JavaScriptValuesBuffer(runtime, start: argumentsPtr.value, count: argumentsCount)
          let thisValue = JavaScriptValue(runtime, this)
          try context.call(thisValue, consume arguments).writeJSIValue(to: resultPtr.value)
`,
    );

    next = next.replace(
      `    nonisolated(unsafe) let thisPtr = thisPtr
    nonisolated(unsafe) let argumentsPtr = argumentsPtr
    nonisolated(unsafe) let resultPtr = resultPtr

    // See \`withGuaranteedContext\` for why neither the context nor the runtime is retained here, and
    // why the result is written to the caller's slot instead of being returned.
    return withGuaranteedContext(context) { (context: UnownedThisHostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let arguments = JavaScriptValuesBuffer(runtime, start: argumentsPtr, count: argumentsCount)
          let thisValue = JavaScriptUnownedValue(runtime.pointee, thisPtr)
          try context.call(thisValue, consume arguments).writeJSIValue(to: resultPtr)
`,
      `    let thisPtr = UnsafeSendableBox(thisPtr)
    let argumentsPtr = UnsafeSendableBox(argumentsPtr)
    let resultPtr = UnsafeSendableBox(resultPtr)

    // See \`withGuaranteedContext\` for why neither the context nor the runtime is retained here, and
    // why the result is written to the caller's slot instead of being returned.
    return withGuaranteedContext(context) { (context: UnownedThisHostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let arguments = JavaScriptValuesBuffer(runtime, start: argumentsPtr.value, count: argumentsCount)
          let thisValue = JavaScriptUnownedValue(runtime.pointee, thisPtr.value)
          try context.call(thisValue, consume arguments).writeJSIValue(to: resultPtr.value)
`,
    );

    return next;
  });
}

function cleanJsiCaches(pkg) {
  const apple = join(pkg, "apple");
  for (const cache of [
    join(apple, ".DerivedData"),
    join(apple, ".build"),
    join(apple, ".swiftpm"),
    join(apple, "Products", "ExpoModulesJSI.xcframework"),
    join(pkg, ".DerivedData"),
    join(pkg, ".build"),
  ]) {
    rmSync(cache, { recursive: true, force: true });
  }
}

const roots = [join(ROOT, "node_modules"), join(ROOT, "apps/mobile/node_modules")];
const jsiPackages = [...new Set(roots.flatMap((root) => findPackages(root, "expo-modules-jsi")))];
const corePackages = [...new Set(roots.flatMap((root) => findPackages(root, "expo-modules-core")))];

let files = 0;

for (const pkg of jsiPackages) {
  walk(join(pkg, "apple"), (path) => {
    if (path.endsWith(".swift") && patchWeakLet(path)) files += 1;
    if (path.endsWith("RuntimeScheduler.h") && patchRuntimeScheduler(path)) files += 1;
    if (path.endsWith("JavaScriptRuntime.swift") && patchJavaScriptRuntime(path)) files += 1;
    if (
      (path.endsWith("JavaScriptError.swift") ||
        path.endsWith("JavaScriptValue.swift") ||
        path.endsWith("JavaScriptPropNameID.swift")) &&
      patchSendableRuntimeClasses(path)
    ) {
      files += 1;
    }
  });
  cleanJsiCaches(pkg);
}

for (const pkg of corePackages) {
  walk(join(pkg, "ios"), (path) => {
    if (path.endsWith(".swift") && patchWeakLet(path)) files += 1;
  });
}

if (files === 0) {
  console.log("fix-expo-jsi-xcode26: already applied");
} else {
  console.log(`fix-expo-jsi-xcode26: patched ${files} files`);
}
