let typeDefinitions = `
type SystemSettings {
    version: String
    release: String
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

type Neuron {
    id: String!
    idNumber: Int
    idString: String
    tag: String
    keywords: String
    brainArea: BrainArea
    tracings: [Tracing]
}

type Tracing {
    id: String!
    nodeCount: Int
    transformedAt: Float
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
    
type Error {
    message: String
    name: String
}

type RequestExportOutput {
    filename: String
    contents: String
}

input InputPosition {
    x: Float
    y: Float
    z: Float
}

input FilterInput {
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

type Query {
    systemSettings: SystemSettings
    
    queryOperators: [QueryOperator!]!
    brainAreas: [BrainArea!]!
    structureIdentifiers: [StructureIdentifier!]!
    tracingStructures: [TracingStructure!]!

    queryData(filters: [FilterInput!]): QueryOutput

    systemMessage: String
}

type Mutation {   
   requestExport(tracingIds: [String!], format: Int): [RequestExportOutput]
   
   setSystemMessage(message: String): Boolean
   clearSystemMessage: Boolean
}

schema {
  query: Query
  mutation: Mutation
}`;

export default typeDefinitions;
