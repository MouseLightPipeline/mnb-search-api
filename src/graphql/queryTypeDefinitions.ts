export const QueryTypeDefinitions = `
scalar Date

enum CcfVersion {
    CCFV25
    CCFV30
}

enum PredicateType {
    ANATOMICAL
    CUSTOM
    ID
}

type SystemSettings {
    apiVersion: String
    apiRelease: Int
    neuronCount: Int
}

type QueryOperator {
    id: String
    display: String
    operator: String
}

type BrainArea {
    id: String!
    name: String
    structureId: Int
    depth: Int
    parentStructureId: Int
    structureIdPath: String
    safeName: String
    acronym: String
    aliasList: [String]
    atlasId: Int
    graphId: Int
    graphOrder: Int
    hemisphereId: Int
    geometryFile: String
    geometryColor: String
    geometryEnable: Boolean
}

type TracingStructure {
    id: String!
    name: String
    value: Int
}

type StructureIdentifier {
    id: String!
    name: String
    value: Int
}

type Sample {
    id: String!
    idNumber: Int
}

type Neuron {
    id: String!
    idNumber: Int
    idString: String
    tag: String
    keywords: String
    brainArea: BrainArea
    sample: Sample
    consensus: Int
    manualSomaCompartment: BrainArea
    tracings: [Tracing]
}

type Tracing {
    id: String!
    transformedAt: Date
    soma: Node
    tracingStructure: TracingStructure
    nodes(brainAreaIds: [String!]): [Node!]!
    nodeCount: Int
    pathCount: Int
    branchCount: Int
    endCount: Int
}

type Node {
    id: String!
    sampleNumber: Int
    x: Float
    y: Float
    z: Float
    radius: Float
    parentNumber: Int
    lengthToParent: Float
    brainAreaIdCcfV25: String
    brainAreaIdCcfV30: String
    structureIdentifier: StructureIdentifier
    structureIdentifierId: String
    structureIdValue: Int
}

type QueryOutput {
    neurons: [Neuron]
    totalCount: Int
    queryTime: Int
    nonce: String
    error: Error
}

type SearchOutput {
    nonce: String
    ccfVersion: CcfVersion!
    queryTime: Int
    totalCount: Int
    neurons: [Neuron]
    error: Error
}

type Error {
    message: String
    code: String
    name: String
}

input InputPosition {
    x: Float
    y: Float
    z: Float
}

input FilterInput {
    tracingIdsOrDOIs: [String!]
    tracingIdsOrDOIsExactMatch: Boolean
    brainAreaIds: [String!]
    arbCenter: InputPosition
    arbSize: Float
    tracingStructureIds: [String!]
    nodeStructureIds: [String!]
    operatorId: String
    amount: Float
    invert: Boolean
    composition: Int
    nonce: String
}

input Predicate {
    predicateType: PredicateType!
    tracingIdsOrDOIs: [String!]
    tracingIdsOrDOIsExactMatch: Boolean
    brainAreaIds: [String!]
    arbCenter: InputPosition
    arbSize: Float
    tracingStructureIds: [String!]
    nodeStructureIds: [String!]
    operatorId: String
    amount: Float
    invert: Boolean
    composition: Int
}

input SearchContext {
    nonce: String
    scope: Int
    ccfVersion: CcfVersion!
    predicates: [Predicate!]
}

"""
The range of valid indices for requesting slices for each plane.  Not required if requesting by actual location.
"""
type SliceLimits {
    """2-element vector for min/max of range."""
    sagittal: [Float]
    """2-element vector for min/max of range."""
    horizontal: [Float]
    """2-element vector for min/max of range."""
    coronal: [Float]
}

"""
Metadata for available image slices for a given sample.  This information is no required for typical slice 
requests where a a location is provided, other than the sample id.
"""
type TomographyMetadata {
    id: String
    name: String
    origin: [Float]
    pixelSize: [Float]
    threshold: [Float]
    limits: SliceLimits
}

type Query {
    systemSettings(searchScope: Int): SystemSettings
    systemMessage: String          

    queryOperators: [QueryOperator!]!
    brainAreas: [BrainArea!]!
    samples: [Sample!]!
    neurons: [Neuron!]!
    structureIdentifiers: [StructureIdentifier!]!
    tracingStructures: [TracingStructure!]!

    queryData(filters: [FilterInput!]): QueryOutput @deprecated(reason: "migrate to searchNeurons() query")
    searchNeurons(context: SearchContext): SearchOutput
    
    """Provides all tomography metadata."""
    tomographyMetadata: [TomographyMetadata!]
}
`;
