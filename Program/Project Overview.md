# LADR Visualizer — Project Overview

The LADR Visualizer is a web-based mathematical sandbox built around Sheldon Axler's *Linear Algebra Done Right*. The goal is an interactive environment in which the full conceptual arc of the book — from the definition of a vector space through spectral theory, singular value decomposition, and tensor products — can be explored, manipulated, and examined from multiple levels of abstraction simultaneously.

## What it is and what it isn't

Most linear algebra visualization tools are essentially graphing calculators with a geometry view bolted on. They work well for the first few weeks of a course, while everything fits in ℝ² or ℝ³, and then become useless exactly when the subject gets interesting. The LADR Visualizer is designed around the fact that Axler's book quickly moves into territory — quotient spaces, dual spaces, generalized eigenspaces, bilinear forms — where naive geometric visualization is not just inadequate but actively misleading.

The guiding principle is that the tool should be *honest* about its representations. For objects that live in low-dimensional real space, geometric views are used directly. For higher-dimensional or intrinsically abstract objects, the tool switches to structured alternatives: abstract diagram renderers showing spaces as nodes and maps as arrows, matrix heatmaps, spectral plots, coordinate tables, symbolic expressions. The goal is not to make every concept look like an arrow in space, but to make every concept *inspectable* — to give the user enough handles on the object that the mathematical structure becomes apparent at the appropriate level of abstraction.

The other core design commitment is to treat the tool as a *sandbox* rather than a presentation system. A presentation system renders fixed scenes. A sandbox allows the user to define their own objects — a linear map by entering a formula, a subspace by specifying generators, an inner product by providing its matrix — and then compose them, apply computations, and view the results across multiple simultaneous renderers. This distinction drives much of the technical architecture.

## Where the project stands

The first phase of work has been architectural planning. Starting from a comprehensive feature survey covering all nine chapters of Axler's book, the project has produced a detailed technical architecture document that does three things the feature survey did not: it separates computation from rendering from state management from pedagogy as distinct system layers; it specifies concrete technology choices with rationale; and it identifies the design patterns that allow the system to remain composable as it grows.

## Technical shape

The application is built on React and TypeScript, with Vite as the build system. The key technical decisions reflect the mathematical requirements rather than the path of least resistance.

Symbolic computation runs on Pyodide with SymPy, compiled to WebAssembly and running in a Web Worker. This is necessary because the book's later chapters — minimal polynomials, Jordan form, exact eigenvalues, polynomial factorization — require genuine computer algebra, not just floating-point arithmetic. Numerical computation for visualization purposes runs separately on ml-matrix. The system tracks whether any given result is exact or approximate and surfaces that distinction to the user, because the difference matters mathematically.

The rendering layer has six specialized renderers: a 3D geometric renderer built on React Three Fiber, a 2D geometric renderer in D3/SVG, an abstract diagram renderer for spaces-and-maps views built on Dagre, a matrix renderer, a symbolic/LaTeX renderer via KaTeX, and a chart renderer for spectral and dimensional data. These are decoupled from the mathematical objects through a **visualization registry** — a runtime structure that maps each mathematical type to the set of applicable visualizers, so that any object can be viewed in any appropriate representation without hard-coded dependencies between layers.

Application state is managed through Zustand and includes not just the mathematical objects themselves but the user's current field selection (ℝ or ℂ), active basis choices per space, and session history. Basis in particular is tracked as session-level state rather than as a property of a vector space, which is the correct mathematical treatment and the one that makes change-of-basis views update coherently.

A pedagogy layer sits above the core infrastructure and will house the definition catalog (structured records linking each LADR definition to examples, nonexamples, linked visualizers, and prerequisite concepts), a library of scene templates for standard demonstrations, and a constraint-based example generator for producing concrete instances of structural properties on demand.

## What comes next

The architecture document establishes the layering and the major technical choices. The next phase of work is scaffolding the project — initializing the repository structure, establishing the mathematical type system in TypeScript (which is the spine everything else depends on), and getting the computation engine running in its Web Worker before any UI work begins. The type system and computation layer are load-bearing for everything that follows; the rendering and pedagogy layers can be built incrementally once those foundations are in place.
