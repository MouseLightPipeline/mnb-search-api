import {Sequelize, Model, FindOptions} from "sequelize";

export enum EntityType {
    MouseStrain,
    InjectionVirus,
    Fluorophore,
    RegistrationTransform,
    Sample,
    Injection,
    Neuron
}

export class BaseModel extends Model {
    public id: string;
}
