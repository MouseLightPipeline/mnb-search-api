export const QueryTypeDefinitions = `
scalar Date

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
    aliases: [String]
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
    brainArea: BrainArea
    brainAreaId: String
    structureIdentifier: StructureIdentifier
    structureIdentifierId: String
    structureIdValue: Int
}

type BrainCompartmentContent {
    id: String
    brainArea: BrainArea
    tracing: Tracing
    nodeCount: Int
    somaCount: Int
    pathCount: Int
    branchCount: Int
    endCount: Int
}

type QueryOutput {
    neurons: [Neuron]
    totalCount: Int
    queryTime: Int
    nonce: String
    error: Error
}

type SearchOutput {
    neurons: [Neuron]
    totalCount: Int
    queryTime: Int
    nonce: String
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
    predicateType: Int
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
    scope: Int
    nonce: String
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
    structureIdentifiers: [StructureIdentifier!]!
    tracingStructures: [TracingStructure!]!

    queryData(filters: [FilterInput!]): QueryOutput
    searchNeurons(context: SearchContext): SearchOutput
    
    """Provides all tomography metadata."""
    tomographyMetadata: [TomographyMetadata!]
}
`;
