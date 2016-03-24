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
  
  //var ReactDOM = root.ReactDOM || hasRequire && require("react-dom");
  //if (typeof ReactDOM === "undefined") throw new Error("Pyon React requires ReactDOM. If you are using script tags React must come first.");
  
  
  var Pyon = root.Pyon || hasRequire && require("pyon");
  if (typeof Pyon === "undefined") throw new Error("Pyon React requires regular Pyon. If you are using script tags Pyon must come first.");

  var PyonStyle = root.PyonStyle || hasRequire && require("pyon-style");
//  if (typeof PyonStyle === "undefined") throw new Error("Pyon React requires Pyon Style. If you are using script tags Pyon must come first.");
// This will fail silently, maybe I should require it.

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
        var owner = this;
        
        this.layer = this.propValues(this.props);//{};
        
        this.delegate = {
          animationForKey: function(key,value,target) {
            var animationForKey;
            if (owner.childInstance) animationForKey = owner.childInstance.animationForKey.bind(owner.childInstance);
            var animation;
            if (isFunction(animationForKey)) animation = animationForKey(key,value,target);
            return animation;
          },
          render: function() { // This render gets called on animation
            Pyon.beginTransaction({owner: owner}); // FIXME: can be overwritten by manually created transactions. Does not have a problem with batching because not called from a React synthetic event
            if (this.debugMounted) this.setState({});
            //else throw new Error ("delegate render but not mounted"); // Happens a lot, because of work done in componentWillMount!
            Pyon.commitTransaction();
          }.bind(this),
        }
        
        //Pyon.pyonify(this,this.layer,this.delegate);
        
      },
      shouldComponentUpdate: function(nextProps,nextState) {
        var result = true;
        var transaction = Pyon.currentTransaction();
        var settings;
        if (transaction) settings = transaction.settings;
        if (settings && settings.owner && settings.owner !== this) result = false;
        return result;
      },
      
      propValues: function(props) {
        var values = {};
        Object.keys(props).forEach( function(key) {
          if (key !== "children") { // Opaque. Strip out children, which breaks horribly: Uncaught Invariant Violation: Objects are not valid as a React child (found: object with keys {}). If you meant to render a collection of children, use an array instead or wrap the object using createFragment(object) from the React add-ons. Check the render method
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
        Object.keys(props).forEach( function(key) {
          if (key !== "children") { // Opaque. No animation for children, at least for now: Uncaught Invariant Violation: Objects are not valid as a React child (found: object with keys {}). If you meant to render a collection of children, use an array instead or wrap the object using createFragment(object) from the React add-ons. Check the render method
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
            
            //this.registerAnimatableProperty(key); // Shoe
            if (this.childInstance) this.childInstance.registerAnimatableProperty(key); // Shoe
            if (this.delegate && this.delegate.registerAnimatableProperty) this.delegate.registerAnimatableProperty(key);
            
            var oldProp = this.props[key];
            var oldValue = oldProp;
            var isObjectOld = (oldProp !== null && typeof oldProp === "object");
            if (isObjectOld && typeof oldProp.value !== "undefined") oldValue = oldProp.value;
            //var sort;
            //if (animation) sort = animation.sort;
            //if (typeof this.layer[key] === "undefined" || (sort && !sort(value,oldValue)) || (!sort && value !== oldValue)) {
            this.layer[key] = value;
            //}
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
      render: function() { //
        var modelLayer = this.layer;
        var presentationLayer = this.delegate.presentationLayer || modelLayer;
        
        var output = this.propValues(presentationLayer);
        
        var owner = this;
        var layer = modelLayer;
        var delegate = this.delegate;
        
        var reference = function(component) { // Might require format: var CarouselPane = React.createFactory(PyonReact.reactify(CarouselPaneClass));
          if (component && owner.childInstance !== component) {
            owner.childInstance = component;
            
            var autoAnimateRefs = false;
            if (autoAnimateRefs && PyonStyle) {
              var refKeys = Object.keys(component.refs);
              refKeys.forEach( function(item,index) {
                 var element = component.refs[item];
                 PyonStyle.setDelegate(element, owner);
              });
            }

            var swizzleWillReceive = false;
            if (swizzleWillReceive) {
              var originalWillReceiveProps = component.componentWillReceiveProps;
              if (originalWillReceiveProps) {
                owner.originalWrappedComponentWillReceiveProps = originalWillReceiveProps.bind(component);
                component.componentWillReceiveProps = owner.wrappedComponentWillReceiveProps;
              }
            }
            
            Pyon.pyonify(component, layer, delegate);
          }
        }
        output.ref = reference;
        return React.createElement(InnerComponent,output);
        //return InnerComponent(output); // ES6 cannot call a class as a function
      }
    });
    var OuterComponent = React.createFactory(OuterComponentClass);
    return OuterComponent;
  }

  PyonReact.noConflict = function() {
    root.PyonReact = previousPyonReact;
    return PyonReact;
  }
  if (typeof exports !== "undefined") { // http://www.richardrodger.com/2013/09/27/how-to-make-simple-node-js-modules-work-in-the-browser/
    if (typeof module !== "undefined" && module.exports) exports = module.exports = PyonReact;
    exports.PyonReact = PyonReact;
  } else root.PyonReact = PyonReact;
  
}).call(this);