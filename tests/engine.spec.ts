import { expect } from "chai";
import { GameEngine } from "../client/scripts/engine/engine.js";
import { Component, Query, QueryFilter, Simple } from "../client/scripts/engine/types-engine.js";

describe('Basic Engine Tests.', () => {
  let engine: GameEngine<''> = new GameEngine();

  beforeEach(() => {
    engine = new GameEngine();
  });
  
  it('A component can be registered. It receives types and ID as attributes.', () => {
    const obj = engine.registerComponent({
      value: 'test'
    }, 'my-type');

    expect(obj).to.deep.equal({
      id: '0',
      types: ['my-type'],
      value: 'test'
    });
  });

  it('Components get an increasing ID number to reference them.', () => {
    const obj1 = engine.registerComponent({
      value: 'test'
    }, 'my-type');
    
    const obj2 = engine.registerComponent({
      value: 'test'
    }, 'my-type');

    expect(obj1.id).to.equal('0');
    expect(obj2.id).to.equal('1');
  });

  it('If a Component is created, an automatic query for its types can be executed, that returns that object.', () => {
    const obj = engine.registerComponent({
      value: 'test'
    }, ['my-type', 'my-other-type']);

    expect(engine.query('my-type')).to.deep.equal([obj]);
    expect(engine.query('my-other-type')).to.deep.equal([obj]);

    expect(engine.queries()).to.have.length(2);
  });

  it('If a Query is executed that is not registered, it returns [].', () => {
    expect(engine.queries()).to.have.length(0);
    expect(engine.query('nirvana')).to.deep.equal([]);
  });

  it('A custom query can be registered. If its called, it is executed against all components.', () => {
    type Fruit = {
      fruit: string,
      flavor: string
    };

    const apple = engine.registerComponent({
      fruit: 'apple',
      flavor: 'sour'
    }, 'fruit') as Component<Fruit>;
    const banana = engine.registerComponent({
      fruit: 'banana',
      flavor: 'sweet'
    }, 'fruit') as Component<Fruit>;
    const orange = engine.registerComponent({
      fruit: 'orange',
      flavor: 'sweet'
    }, 'fruit') as Component<Fruit>;

    engine.registerQuery('sweet-fruits', (engine) => (engine.query('fruit') as Simple<Component<Fruit>>[]).filter(c => c?.flavor === 'sweet'))
    
    // 1 for the type 'fruit', one custom one.
    expect(engine.queries()).to.have.length(2);
    expect(engine.query('sweet-fruits')).to.include(banana);
    expect(engine.query('sweet-fruits')).to.include(orange);
  });

  it('If a Component is registered, its change is registered.', () => {
    engine.registerComponent({
      value: 'test'
    }, 'my-type');

    expect(engine.changes()).to.have.length(1);
    expect(engine.changes().get('0')).to.deep.equal({
      value: 'test',
      id: '0',
      types: ['my-type']
    });
  });

  it('If a component is modified retroactively, only this change is registered.', () => {
    type MyType = {value: number | string};

    const obj = engine.registerComponent({
      value: 100
    }, 'my-type') as Component<MyType>;

    // Some change!
    obj.value = 'abc';
    obj.value = 'def';

    expect((engine.changes().get('0') as MyType).value).to.equal('def');
  });

  it('If a component has a query attribute, it is resolved on the access.', () => {
    const obj: Simple<Component<{value: Query<unknown, string>}>> = engine.registerComponent({
      value: (self, engine) => 'hello world!' 
    }, 'my-type');

    // This looks like a property, but is implemented as a query!
    expect(obj.value).to.equal('hello world!');
  });

  
  it('If a component has a query attribute, it is resolved on the access and whenever a change is done.', () => {
    type MyType = {name: string, value: Query<MyType, string>};

    const obj: Simple<Component<MyType>> = engine.registerComponent({
      name: 'john',
      value: (self, engine) => `hello ${self.name}!`
    }, 'my-type');

    // This looks like a property, but is implemented as a query!
    expect(obj.value).to.equal('hello john!');

    obj.name = 'paul';
    expect(obj.value).to.equal('hello paul!');
  });

  it('If the query attribute is tried to be set to a different value, an exception is thrown.', () => {
    type MyType = {name: string, value: Query<MyType, string>};
    const obj: Simple<Component<MyType>> = engine.registerComponent({
      name: 'john',
      value: (self, engine) => `hello ${self.name}!`
    }, 'my-type');

    expect(() => {
      obj.value = 'something else, doesnt work!';
    }).to.throw(/query/i);
  });

  it('A component with a nested object inside it automatically extracts that object and registers it as an anonymous component.', () => {
    const obj = engine.registerComponent({
      nested: {
        value: 'test'
      },
      upper: 'upper'
    }, 'test');

    expect(obj.upper).to.equal('upper');
    expect(obj.nested).to.deep.equal({id: '1', types: ['anonymous'], value: 'test'}); // This is an anonymous registered component!
    expect(obj.nested.value).to.equal('test');

    expect(engine.components()).to.have.length(2);
  });

  it('A component with an array inside one of its properties generates an anonymous type for that array, too.', () => {
    const obj = engine.registerComponent({
      fields: ['A', 'B', 'C'],
      value: 'test'
    }, 'test');

    expect(obj.value).to.equal('test');
    expect(obj.fields).to.include('A');
    expect(obj.fields).to.include('B');
    expect(obj.fields).to.include('C');

    // These values are naturally available, although basically never needed.
    // @ts-ignore
    expect(obj.fields.id).to.equal('1');
    // @ts-ignore
    expect(obj.fields.types).to.deep.equal(['anonymous']);

    expect(obj.fields[0]).to.deep.equal('A');

    expect(engine.components()).to.have.length(2);
  });

  it('A component with an array property that holds more nested objects works as expected.', () => {
    const complex = engine.registerComponent({
      fields: [{nested: '123'}, {nested: '234'}, {nested: '345', flag: true}]
    }, 'test');

    expect(engine.components()).to.have.length(5);
    // Check some field - all is superficious.

    expect(complex.fields[2].flag).to.equal(true);
  });

  it('If a component is directly related to another component, it can be accessed as usual.', () => {
    type MyType = {value: number, reference?: MyType};

    const obj1: MyType = engine.registerComponent({
      reference: undefined,
      value: 1
    }, 'test-1');
    const obj2: MyType = engine.registerComponent({
      reference: undefined,
      value: 2
    }, 'test-2');

    // We don't care about the syntax, just the semantic here - types are secondary for now.
    obj1.reference = obj2;
    obj2.reference = obj1;

    // Obj1 loops back to itself!
    expect(obj1.reference.reference).to.deep.equal({
      id: '0',
      types: ['test-1'],
      reference: obj2,
      value: 1
    });
  });

  it('If a component is directly related to another component via a query, it can be accessed as usual.', () => {
    type MyType = Component<{value: number, reference: Query<MyType, MyType>}>;

    const obj1: Simple<MyType> = engine.registerComponent({
      reference: (self, engine) => (engine.query('test-2') as Simple<MyType>[])[0], // Reference created via query!
      value: 1
    }, 'test-1');
    const obj2: Simple<MyType> = engine.registerComponent({
      reference: (self, engine) => (engine.query('test-1') as Simple<MyType>[])[0], // Reference created via query!
      value: 2
    }, 'test-2');

    // Obj1 loops back to itself!
    expect(obj1.reference.reference).to.deep.equal({
      id: '0',
      types: ['test-1'],
      reference: obj2,
      value: 1
    });
  });

  it('If a component is serialized, it is serialized into JSON format.', () => {
    const test = engine.registerComponent({
      value: 'test'
    }, 'test');

    const serialized = JSON.stringify(test);

    expect(JSON.parse(serialized)).to.deep.equal({
      value: 'test',
      id: '0',
      types: ['test']
    })
  });

  
  it('If a component with a relation to another component is serialized, the referenced component is related to via an ID identifier "@ID".', () => {
    type MyType = Component<{value: number, reference: Query<MyType, MyType>}>;

    const obj1: Simple<MyType> = engine.registerComponent({
      reference: (self, engine) => (engine.query('test-2') as Simple<MyType>[])[0], // Reference created via query!
      value: 1
    }, 'test-1');
    const obj2: Simple<MyType> = engine.registerComponent({
      reference: (self, engine) => (engine.query('test-1') as Simple<MyType>[])[0], // Reference created via query!
      value: 2
    }, 'test-2');

    const serialized = JSON.stringify(obj1);

    expect(JSON.parse(serialized)).to.deep.equal({
      value: 0,
      reference: '@1',
      id: '0',
      types: ['test-1']
    })
  });
});