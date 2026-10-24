declare module 'clipper-lib' {
  namespace ClipperLib {
    interface IntPoint { X: number; Y: number }
    type Path = IntPoint[];
    type Paths = Path[];
    const Paths: { new(): Paths };
    const PolyType: { ptSubject: number; ptClip: number };
    const ClipType: { ctUnion: number; ctDifference: number };
    const PolyFillType: { pftNonZero: number };
    const JoinType: { jtRound: number };
    const EndType: { etClosedPolygon: number };
    class Clipper {
      AddPaths(paths: Paths, polyType: number, closed: boolean): boolean;
      Execute(type: number, solution: Paths, subjectFill: number, clipFill: number): boolean;
      static CleanPolygons(paths: Paths, distance: number): Paths;
      static SimplifyPolygon(path: Path, fill: number): Paths;
      static Orientation(path: Path): boolean;
    }
    class ClipperOffset {
      constructor(miterLimit: number, arcTolerance: number);
      AddPaths(paths: Paths, join: number, end: number): void;
      Execute(solution: Paths, delta: number): void;
    }
  }
  export = ClipperLib;
}
