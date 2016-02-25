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
  var root = this;
  var previousPyon = root.PyonReact;
  var hasRequire = (typeof require !== "undefined");
  
  var React = root.React || hasRequire && require("react");
  if (typeof React === "undefined") throw new Error("Pyon React requires React. If you are using script tags React must come first.");
  
  var Pyon = root.Pyon || hasRequire && require("pyon");
  if (typeof Pyon === "undefined") throw new Error("Pyon React requires regular Pyon. If you are using script tags Pyon must come first.");

  function isFunction(w) {
    return w && {}.toString.call(w) === "[object Function]";
  }
  
  var PyonReact = root.PyonReact = {};
  PyonReact.reactify = function(InnerComponent) {
    var OuterComponentClass = React.createClass({
      displayName : "PyonComponent",
      getInitialState : function() {
          return {}
      },
      initialize: function() {
        this.debugCount = 0;
        this.childInstance = null;
        this.debugMounted = false;
        this.animationDict = {};
        var component = this;
        var layer = this.layer = this.propValues(this.props);//{};
        var delegate = this.delegate = {
        
          animationForKey: function(key,value) {
            return component.manualAnimationForKey(key,value);
          },
          
          render: function() { // This render gets called on animation
            Pyon.beginTransaction({owner: component}); // FIXME: can be overwritten by manually created transactions. Does not have a problem with batching because not called from a React synthetic event
            if (this.debugMounted) this.setState({});
            //else throw new Error ("delegate render but not mounted"); // Happens a lot, because of work done in componentWillMount!
            Pyon.commitTransaction();
          }.bind(this),
        }
        
        Pyon.pyonify(this,layer,delegate);
        
      },
      shouldComponentUpdate: function(nextProps,nextState) {
        var result = true;
        var transaction = Pyon.currentTransaction();
        var settings;
        if (transaction) settings = transaction.settings;
        if (settings && settings.owner && settings.owner !== this) result = false;
        return result;
      },
      animationForKey: function(key,value) { // For this to get called in ES5: var AnimatableComponent = React.createFactory(PyonReact.reactify(AnimatableComponentClass));
        // FIXME: This gets called when setting values on presentationLayer, because componentWillReceiveProps
        var animation = null;
        var childInstance = this.childInstance;
        if (childInstance && isFunction(childInstance.animationForKey)) animation = childInstance.animationForKey(key,value);
        if (typeof animation === "undefined" || animation === null) animation = this.animationDict[key]; // return false in animationForKey to not use default
        if (animation === false) return null; // allows false to stop lookup
        return animation;
      },
      manualAnimationForKey: function(key,value) { // For this to get called in ES5: var AnimatableComponent = React.createFactory(PyonReact.reactify(AnimatableComponentClass));
        var animation = null;
        var childInstance = this.childInstance;
        if (childInstance && isFunction(childInstance.animationForKey)) animation = childInstance.animationForKey(key,value);
        if (typeof animation === "undefined" || animation === null) animation = this.animationDict[key]; // return false in animationForKey to not use default
        if (animation === false) return null; // allows false to stop lookup
        return animation;
      },
      propValues: function(props) { // strip out change descriptions and provide just the values
        var values = {};
        Object.keys(props).forEach( function(key) {
          var prop = props[key];
          var value = prop;
          var isObject = (prop !== null && typeof prop === "object");
          if (isObject && typeof prop.value !== "undefined") value = prop.value;
          values[key] = value;
        });
        return values;
      },
      processProps: function(props) {
        var layer = this.layer;
        Object.keys(props).forEach( function(key) {
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
          this.animationDict[key] = transition;
          
          this.registerAnimatableProperty(key); // Shoe
          
          var oldProp = this.props[key];
          var oldValue = oldProp;
          var isObjectOld = (oldProp !== null && typeof oldProp === "object");
          if (isObjectOld && typeof oldProp.value !== "undefined") oldValue = oldProp.value;
          //var sort;
          //if (animation) sort = animation.sort;
          //if (typeof layer[key] === "undefined" || (sort && !sort(value,oldValue)) || (!sort && value !== oldValue)) {
            layer[key] = value;
          //}
          var manualImplicit = false;
          if (manualImplicit) {
            if (oldValue !== value) {
              var name; // I need this. must store in change description
              var animation = this.manualAnimationForKey(key,value);
              if (animation) { // have to reproduce everything from Pyon setValueForKey because it's complicated
                if (animation.property === null || typeof animation.property === "undefined") animation.property = key;
                if (animation.from === null || typeof animation.from === "undefined") {
                  if (animation.blend === "absolute") animation.from = this.presentationLayer[property]; // use presentation layer
                  else animation.from = oldValue;
                }
                if (animation.to === null || typeof animation.to === "undefined") animation.to = value;
              
              this.addAnimation(animation,name); // Shoe
              }
            }
          }
        }.bind(this));
      },
      
      wrappedComponentWillReceiveProps: function(props) {
        // ensure child component is not given animated values
        // These are not assigned. You do that in render.
        var modelLayer = this.modelLayer;
        var copy = Object.keys(props).reduce( function(a, b) {
          a[b] = modelLayer[b];
          if (a[b] === null || typeof a[b] === "undefined") a[b] = props[b];
          return a;
        }, {});
        
        if (this.childInstance) {
          var originalWrappedComponentWillReceiveProps = this.originalWrappedComponentWillReceiveProps.bind(this.childInstance);
          originalWrappedComponentWillReceiveProps(copy);
        }
      },
      
      componentWillReceiveProps: function(props) {
        if (!this.debugMounted) throw new Error("GET THE HELL OUT OF HERE WITH YOUR BEING NOT MOUNTED");
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
              var copy = Object.keys(animation).reduce(function(a, b) { a[b] = animation[b]; return a;}, {});
              if (copy) {
                copy.property = key;
                this.addAnimation(copy); // Shoe
              }
            }
          }
        }.bind(this));
      },
      componentWillUnmount: function() {
        this.debugMounted = false;
      },
      componentDidMount: function() {
        this.debugMounted = true;
      },
      render: function() { // this.props has change descriptions instead of actual values
        var propValues = this.propValues(this.props);
        var presentationLayer = this.presentationLayer;
        var output = this.propValues(this.presentationLayer);
        var modelLayer = this.modelLayer;
        var innerComponentRef = output.ref;
        
        if (false) Object.keys(presentationLayer).forEach( function(key) {
          output[key] = presentationLayer[key];
        });
        
        var owner = this;
        var ref = function(component) { // Happens often. Might require format: var CarouselPane = React.createFactory(PyonReact.reactify(CarouselPaneClass));
          if (component && owner.childInstance !== component) {
            owner.childInstance = component;
            
            var swizzleWillReceive = true;
            if (swizzleWillReceive) {
              var originalWillReceiveProps = component.componentWillReceiveProps;
              if (originalWillReceiveProps) {
                owner.originalWrappedComponentWillReceiveProps = originalWillReceiveProps.bind(component);
                component.componentWillReceiveProps = owner.wrappedComponentWillReceiveProps;
              }
            }
            
            // TODO: Do not duplicate methods to every object. Need a less memory intensive way to decorate
            // Shoe
            component.addAnimation = owner.addAnimation.bind(owner);
            component.animationNamed = owner.animationNamed.bind(owner);
            component.removeAnimation = owner.removeAnimation.bind(owner);
            component.removeAllAnimations = owner.removeAllAnimations.bind(owner);
            Object.defineProperty(component, "animations", {
              get: function() {
                return owner.animations;
              },
              enumerable: false,
              configurable: false
            });
            Object.defineProperty(component, "animationNames", {
              get: function() {
                return owner.animationNames;
              },
              enumerable: false,
              configurable: false
            });
            Object.defineProperty(component, "presentationLayer", {
              get: function() {
                return owner.presentationLayer;
              },
              enumerable: false,
              configurable: false
            });
            Object.defineProperty(component, "modelLayer", {
              get: function() {
                return owner.modelLayer;
              },
              enumerable: false,
              configurable: false
            });
          }
        }
        
        output.ref = ref;
        return React.createElement(InnerComponent,output);
        //return InnerComponent(output); // ES6 cannot call a class as a function
      }
    });
    var OuterComponent = React.createFactory(OuterComponentClass);
    //var OuterComponent = React.createElement.bind(null,OuterComponentClass);
    return OuterComponent;
  }

  PyonReact.noConflict = function() {
    root.PyonReact = previousPyonReact;
    return PyonReact;
  }
  if (typeof exports !== "undefined") { // http://www.richardrodger.com/2013/09/27/how-to-make-simple-node-js-modules-work-in-the-browser/#.VpuIsTZh2Rs
    if (typeof module !== "undefined" && module.exports) exports = module.exports = PyonReact;
    exports.PyonReact = PyonReact;
  } else root.PyonReact = PyonReact;
  
}).call(this);