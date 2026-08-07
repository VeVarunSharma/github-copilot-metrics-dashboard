export class DimensionWriteGate {
  private tail: Promise<void> = Promise.resolve();

  run<T>(work: () => Promise<T>): Promise<T> {
    const run = this.tail.then(work, work);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

const processDimensionWriteGate = new DimensionWriteGate();

export function withSerializedDimensionWrites<T>(work: () => Promise<T>): Promise<T> {
  return processDimensionWriteGate.run(work);
}
