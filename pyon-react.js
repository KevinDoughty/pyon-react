/*
Copyright (c) 2016 Kevin Doughty

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
"use strict";
(function() {


  var BLOCK_PROPS_CHANGE_AND_UPDATE = true;



  var root = this;
  var previousPyon = root.PyonReact;
  var hasRequire = (typeof require !== "undefined");
  
  var React = root.React || hasRequire && require("react");
  if (typeof React === "undefined") throw new Error("Pyon React requires React. If you are using script tags React must come first.");
  
  var ReactDOM = root.ReactDOM || hasRequire && require("react-dom");
  if (typeof ReactDOM === "undefined") throw new Error("Pyon React requires ReactDOM. If you are using script tags React must come first.");
  
  
  var Pyon = root.Pyon || hasRequire && require("pyon");
  if (typeof Pyon === "undefined") throw new Error("Pyon React requires regular Pyon. If you are using script tags Pyon must come first.");

  var PyonStyle = root.PyonStyle || hasRequire && require("pyon-style");
//  if (typeof PyonStyle === "undefined") throw new Error("Pyon React requires Pyon Style. If you are using script tags Pyon must come first.");
// This will fail silently, maybe I should require it.

  function isFunction(w) {
    return w && {}.toString.call(w) === "[object Function]";
  }

  var PyonReact = root.PyonReact = {};



  PyonReact.animateProps = function(InnerComponent) {
    if (typeof window === "undefined") return InnerComponent;
    var childInstance;
    var forceUpdate;
    var animationDict = {};
    var layer;
    var delegate = {
      animationForKey: function(key,value,target) {
        var animationForKey;
        if (childInstance) animationForKey = childInstance.animationForKey;
        else throw new Error("PyonReact animateProps InnerComponent animationForKey no child instance");
        var animation;
        if (isFunction(animationForKey)) animation = animationForKey.call(childInstance,key,value,target);
        return animation;
      },
      render: function() { // This render gets called on animation and is not related to React component render
        var componentWillReceiveProps;
        var componentWillUpdate;
        var componentDidUpdate;
        var shouldComponentUpdate;
        if (BLOCK_PROPS_CHANGE_AND_UPDATE && childInstance) {
          componentWillReceiveProps = childInstance.componentWillReceiveProps;
          if (isFunction(componentWillReceiveProps)) childInstance.componentWillReceiveProps = null; // I want to do this but can't because it breaks uses of props animation, e.g. caching previous value in state
          componentWillUpdate = childInstance.componentWillUpdate;
          if (isFunction(componentWillUpdate)) childInstance.componentWillUpdate = null; // I want to do this but can't because it breaks uses of props animation, e.g. caching previous value in state
          componentDidUpdate = childInstance.componentDidUpdate;
          if (isFunction(componentDidUpdate)) childInstance.componentDidUpdate = null; // I want to do this but can't because it breaks uses of props animation, e.g. caching previous value in state
          shouldComponentUpdate = childInstance.shouldComponentUpdate;
          if (isFunction(shouldComponentUpdate)) childInstance.shouldComponentUpdate = null; // I want to do this but can't because it breaks uses of props animation, e.g. caching previous value in state
        }
        forceUpdate();
        if (isFunction(componentWillReceiveProps)) childInstance.componentWillReceiveProps = componentWillReceiveProps.bind(childInstance);
        if (isFunction(componentWillUpdate)) childInstance.componentWillUpdate = componentWillUpdate.bind(childInstance);
        if (isFunction(componentDidUpdate)) childInstance.componentDidUpdate = componentDidUpdate.bind(childInstance);
        if (isFunction(shouldComponentUpdate)) childInstance.shouldComponentUpdate = shouldComponentUpdate.bind(childInstance);
      }
    };

    // Lifecycle method overrides, if BLOCK_PROPS_CHANGE_AND_UPDATE
    var originalWrappedShouldComponentUpdate;
    var wrappedShouldComponentUpdate = function(props,state) { // ensure child component is not given animated values
      var modelLayer = childInstance.modelLayer;
      var copy = Object.keys(props).reduce( function(a, b) {
        a[b] = modelLayer[b];
        if (a[b] === null || typeof a[b] === "undefined") a[b] = props[b];
        return a;
      }, {});
      return originalWrappedShouldComponentUpdate(copy, state);
    };

    var originalWrappedComponentWillReceiveProps;
    var wrappedComponentWillReceiveProps = function(props) { // ensure child component is not given animated values
      var modelLayer = childInstance.modelLayer;
      var copy = Object.keys(props).reduce( function(a, b) {
        a[b] = modelLayer[b];
        if (a[b] === null || typeof a[b] === "undefined") a[b] = props[b];
        return a;
      }, {});
      originalWrappedComponentWillReceiveProps(copy);
    };

    var originalWrappedComponentWillUpdate;
    var wrappedComponentWillUpdate = function(props,state) { // ensure child component is not given animated values
      var modelLayer = childInstance.modelLayer;
      var copy = Object.keys(props).reduce( function(a, b) {
        a[b] = modelLayer[b];
        if (a[b] === null || typeof a[b] === "undefined") a[b] = props[b];
        return a;
      }, {});
      originalWrappedComponentWillUpdate(copy, state);
    };

    var originalWrappedComponentDidUpdate;
    var wrappedComponentDidUpdate = function(props,state) { // ensure child component is not given animated values
      var previousLayer = childInstance.previousLayer;
      var copy = Object.keys(props).reduce( function(a, b) {
        a[b] = previousLayer[b];
        if (a[b] === null || typeof a[b] === "undefined") a[b] = props[b];
        return a;
      }, {});
      originalWrappedComponentDidUpdate(copy, state);
    };

    var OuterComponentClass = React.createClass({
      displayName : "PyonComponent",
      getInitialState : function() {
          return {}
      },
      initialize: function() {
        forceUpdate = this.forceUpdate.bind(this);
        layer = this.propValues(this.props);
      },
//       shouldComponentUpdate: function(nextProps,nextState) {
//         return true; // There is still one render to be trimmed out, but probably not here. An immediate render then a tick.
//       },
      propValues: function(props) {
        var values = {};
        Object.keys(props).forEach( function(key) {
          if (key !== "children") { // Opaque. Direct children animation (probably) not possible
            var prop = props[key];
            var value = prop;
            var isObject = (prop !== null && typeof prop === "object");
            if (isObject && typeof prop.value !== "undefined") value = prop.value;
            values[key] = value;
          }
        });
        return values;
      },
      processProps: function(props) {
        Pyon.beginTransaction();
        Object.keys(props).forEach( function(key) {
          if (key === "animations") {
            var animations = props.animations;
            if (childInstance && childInstance.addAnimation && Array.isArray(animations)) {
              animations.forEach( function(animation) {
                childInstance.addAnimation(animation,animation.key); // TODO: figure out if this will work on stateless components
              });
            }
          } else if (key !== "children") { // Opaque. Direct children animation (probably) not possible
            var transition;
            var prop = props[key];
            var value = prop;
            var isObject = (prop !== null && typeof prop === "object");
            if (isObject && typeof prop.value !== "undefined") { // detect if a change description
              value = prop.value;
              transition = prop.animation;
              if (prop.transition) transition = prop.transition;
            }
            if (typeof transition === "undefined") transition = null;
            animationDict[key] = transition;
            
            if (childInstance) childInstance.registerAnimatableProperty(key); // Shoe
            
            var oldProp = this.props[key];
            var oldValue = oldProp;
            var isObjectOld = (oldProp !== null && typeof oldProp === "object");
            if (isObjectOld && typeof oldProp.value !== "undefined") oldValue = oldProp.value;
            
            layer[key] = value;
          }
        }.bind(this));
        Pyon.commitTransaction();
      },
      componentWillReceiveProps: function(props) {
        this.processProps(props);
      },
      componentWillMount: function() {
        this.initialize();
        this.processProps(this.props);
        Object.keys(this.props).forEach( function(key) { // have to manually trigger mount animation
          var prop = this.props[key];
          var value = prop;
          var isObject = (prop !== null && typeof prop === "object");
          if (isObject && typeof prop.value !== "undefined") {
            value = prop.value;
            var animation = prop.animation;
            if (prop.mount) animation = prop.mount;
            if (animation) {
              console.warn("change descriptions deprecated.");
              var copy = Object.assign({},animation);
              copy.property = key;
              this.addAnimation(copy); // Shoe
            }
          }
        }.bind(this));
      },
      render: function() {
        var presentationLayer = delegate.presentationLayer || layer;
        var output = this.propValues(presentationLayer);
        var owner = this;
        var reference = function(component) {
          if (component && childInstance !== component) {
            childInstance = component;
            if (BLOCK_PROPS_CHANGE_AND_UPDATE) {
              var originalWillReceiveProps = childInstance.componentWillReceiveProps;
              if (isFunction(originalWillReceiveProps)) {
                originalWrappedComponentWillReceiveProps = originalWillReceiveProps.bind(childInstance);
                childInstance.componentWillReceiveProps = wrappedComponentWillReceiveProps;
              }
              var originalWillUpdate = childInstance.componentWillUpdate;
              if (isFunction(originalWillUpdate)) {
                originalWrappedComponentWillUpdate = originalWillUpdate.bind(childInstance);
                childInstance.componentWillUpdate = wrappedComponentWillUpdate;
              }
              var originalDidUpdate = childInstance.componentDidUpdate;
              if (isFunction(originalDidUpdate)) {
                originalWrappedComponentDidUpdate = originalDidUpdate.bind(childInstance);
                childInstance.componentDidUpdate = wrappedComponentDidUpdate;
              }
              var originalShouldUpdate = childInstance.shouldComponentUpdate;
              if (isFunction(originalShouldUpdate)) {
                originalWrappedShouldComponentUpdate = originalShouldUpdate.bind(childInstance);
                childInstance.shouldComponentUpdate = wrappedShouldComponentUpdate;
              }
            }
            Pyon.pyonify(component, layer, delegate); // FIXME: if childInstance changes, Pyon receiver cannot. You will get errors like cannot redefine property "animations" etc
          }
        }
        output.ref = reference; // TODO: need to handle/restore original ref if it exists
        return React.createElement(InnerComponent,output);
      }
    });
    return OuterComponentClass;
  }



  PyonReact.animateState = function(InnerComponent) {
    if (typeof window === "undefined") return InnerComponent;
    var childInstance;
    var originalWrappedSetState;
    var layer = {};
    var delegate = {
      animationForKey: function(key,value,target) {
        var animationForKey;
        if (childInstance) animationForKey = childInstance.animationForKey;
        else throw new Error("PyonReact animateState InnerComponent animationForKey no child instance");
        var animation;
        if (isFunction(animationForKey)) animation = animationForKey.call(childInstance,key,value,target);
        return animation;
      },
      render: function() { // This render gets called on animation and is not related to React component render
        var componentWillUpdate;
        if (childInstance) {
          componentWillUpdate = childInstance.componentWillUpdate;
          if (isFunction(componentWillUpdate)) childInstance.componentWillUpdate = null; // Yes I am preventing this. Deal. I do not prevent changes from updating children, but maybe I should considering a CA implementation
        }
        var presentationLayer = delegate.presentationLayer || layer;
        originalWrappedSetState(presentationLayer);
        if (isFunction(componentWillUpdate)) childInstance.componentWillUpdate = componentWillUpdate.bind(childInstance);
      }
    }
    var OuterComponentClass = React.createClass({
      wrappedSetState: function(state) {
        // TODO: If there is no returned animation you wil need to manually call setState!
        // You also need to deal with the double render,
        // on setState and tick
        
        // TODO: You must also handle replaceState
        
        //originalWrappedSetState(state);
        
        Pyon.beginTransaction();
        Object.keys(state).forEach( function(key,index) {
          delegate.registerAnimatableProperty(key);
          layer[key] = state[key];
        });
        Pyon.commitTransaction();
      },
      render: function() {
        var owner = this;
        var reference = function(component) {
          if (component && childInstance !== component) {
            childInstance = component;
            var setState = component.setState;
            if (setState) {
              originalWrappedSetState = setState.bind(component);
              component.setState = owner.wrappedSetState;
              Pyon.pyonify(component, layer, delegate);
              var state = component.state;
              Pyon.beginTransaction();
              Object.keys(state).forEach( function(key,index) {
                layer[key] = state[key];
                delegate.registerAnimatableProperty(key);
              });
              Pyon.commitTransaction();
            }
          }
        }
        var output = Object.assign({},this.props,{ ref: reference }); // TODO: need to restore original ref
        return React.createElement(InnerComponent,output);
      }
    });
    return OuterComponentClass;
  };



  PyonReact.animateStyle = function(InnerComponent) {
    if (typeof window === "undefined") return InnerComponent;
    var childInstance;
    var originalWrappedComponentWillMount;
    var originalWrappedComponentDidMount;
    var originalWrappedComponentWillReceiveProps;
    var layer = {};
    var delegate = {
      animationForKey: function(key,value,target) {
        var animationForKey;
        if (childInstance) animationForKey = childInstance.animationForKey;
        else throw new Error("PyonReact animateStyle InnerComponent animationForKey no child instance"); // If so this is my error not the users. Do not throw in production.
        var animation;
        if (isFunction(animationForKey)) animation = animationForKey.call(childInstance,key,value,target);
        return animation;
      }
    };
    var pyonStyleDeclaration = PyonStyle.setDelegate(null, delegate);
    
    var OuterComponentClass = React.createClass({

      processProps: function(props) {
        Pyon.beginTransaction();
        Object.keys(props).forEach( function(key) {
          if (key === "animations") {
            var animations = props.animations;
            if (childInstance && childInstance.addAnimation && Array.isArray(animations)) {
              animations.forEach( function(animation) {
                childInstance.addAnimation(animation,animation.key); // TODO: figure out if this will work on stateless components
              });
            }
          }
        });
        Pyon.commitTransaction();
      },
      componentWillReceiveProps: function(props) {
        this.processProps(props);
      },
      componentWillMount: function() {
        this.processProps(this.props);
      },
      render: function() {
        var owner = this;
        var reference = function(component) {
          if (typeof component !== "undefined" && component !== null && component !== childInstance) {
            Pyon.beginTransaction();
            childInstance = component;
            var element = ReactDOM.findDOMNode(component);
            var style = element.style;
            // TODO: Make the following lines less offensive:
            pyonStyleDeclaration._element = element;
            pyonStyleDeclaration._style = style;
            for (var i = 0; i < style.length; i++) {
              var property = style[i];
              var value = style[property];
              pyonStyleDeclaration._surrogateElement.style[property] = value
              style[property] = value;
            }
            pyonStyleDeclaration._updateIndices();
            Object.defineProperty(element, 'style', { // TODO: This is supposed to be in a try-catch for older browsers
              get: function() { 
                return pyonStyleDeclaration;
              },
              configurable: true,
              enumerable: true
            });
            element.style._pyonInitialized = true;
            
            component.addAnimation = function(animation,name) {
              PyonStyle.addAnimation(element,animation,name);
            }
            Pyon.commitTransaction();
          }
        };
        var output = Object.assign({},this.props,{ ref: reference }); // TODO: need to restore original ref
        return React.createElement(InnerComponent,output);
      }
    });
    return OuterComponentClass;
  };



//   PyonReact.animateRefs = function(InnerComponent) {
//     return InnerComponent;
//   }



  PyonReact.noConflict = function() {
    root.PyonReact = previousPyonReact;
    return PyonReact;
  }
  if (typeof exports !== "undefined") { // http://www.richardrodger.com/2013/09/27/how-to-make-simple-node-js-modules-work-in-the-browser/
    if (typeof module !== "undefined" && module.exports) exports = module.exports = PyonReact;
    exports.PyonReact = PyonReact;
  } else root.PyonReact = PyonReact;
  
}).call(this);