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
      value: (self, engine) => 'hello world' 
    }, 'my-type');

    // This looks like a property, but is implemented as a query!
    expect(obj.value).to.equal('hello world');
  });
});