/**
@module ember
@submodule ember-templates
*/

import { info } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import ViewNodeManager from 'ember-htmlbars/node-managers/view-node-manager';
import topLevelViewTemplate from 'ember-htmlbars/templates/top-level-view';
import isEnabled from 'ember-metal/features';
import VERSION from 'ember/version';

if (!isEnabled('ember-glimmer')) {
  topLevelViewTemplate.meta.revision = 'Ember@' + VERSION;
}

/**
  The `{{outlet}}` helper lets you specify where a child route will render in
  your template. An important use of the `{{outlet}}` helper is in your
  application's `application.hbs` file:

  ```handlebars
  {{! app/templates/application.hbs }}

  <!-- header content goes here, and will always display -->
  {{my-header}}

  <div class="my-dynamic-content">
    <!-- this content will change based on the current route, which depends on the current URL -->
    {{outlet}}
  </div>

  <!-- footer content goes here, and will always display -->
  {{my-footer}}
  ```

  See [templates guide](http://emberjs.com/guides/templates/the-application-template/) for
  additional information on using `{{outlet}}` in `application.hbs`.

  You may also specify a name for the `{{outlet}}`, which is useful when using more than one
  `{{outlet}}` in a template:

  ```handlebars
  {{outlet "menu"}}
  {{outlet "sidebar"}}
  {{outlet "main"}}
  ```

  Your routes can then render into a specific one of these `outlet`s by specifying the `outlet`
  attribute in your `renderTemplate` function:

  ```javascript
  // app/routes/menu.js

  export default Ember.Route.extend({
    renderTemplate() {
      this.render({ outlet: 'menu' });
    }
  });
  ```

  See the [routing guide](http://emberjs.com/guides/routing/rendering-a-template/) for more
  information on how your `route` interacts with the `{{outlet}}` helper.

  Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.

  @public
  @method outlet
  @param {String} [name]
  @for Ember.Templates.helpers
  @public
*/
export default {
  willRender(renderNode, env) {
    env.view.ownerView._outlets.push(renderNode);
  },

  setupState(state, env, scope, params, hash) {
    let outletState = env.outletState;
    let read = env.hooks.getValue;
    let outletName = read(params[0]) || 'main';
    let selectedOutletState = outletState[outletName];

    return {
      outletState: selectedOutletState,
      hasParentOutlet: env.hasParentOutlet,
      manager: state.manager
    };
  },

  childEnv(state, env) {
    let outletState = state.outletState;
    let toRender = outletState && outletState.render;
    let meta = toRender && toRender.template && toRender.template.meta;

    return env.childWithOutletState(outletState && outletState.outlets, true, meta);
  },

  isStable(lastState, nextState) {
    return isStable(lastState.outletState, nextState.outletState);
  },

  isEmpty(state) {
    return isEmpty(state.outletState);
  },

  render(renderNode, env, scope, params, hash, _template, inverse, visitor) {
    let state = renderNode.getState();
    let parentView = env.view;
    let outletState = state.outletState;
    let toRender = outletState.render;
    let namespace = env.owner.lookup('application:main');
    let LOG_VIEW_LOOKUPS = get(namespace, 'LOG_VIEW_LOOKUPS');

    let ViewClass = outletState.render.ViewClass;

    if (!state.hasParentOutlet && !ViewClass) {
      ViewClass = env.owner._lookupFactory('view:toplevel');
    }

    let attrs = {};
    let options = {
      component: ViewClass,
      self: toRender.controller,
      createOptions: {
        controller: toRender.controller
      }
    };

    let template = _template || toRender.template && toRender.template.raw;

    if (LOG_VIEW_LOOKUPS && ViewClass) {
      info('Rendering ' + toRender.name + ' with ' + ViewClass, { fullName: 'view:' + toRender.name });
    }

    if (state.manager) {
      state.manager.destroy();
      state.manager = null;
    }

    let nodeManager = ViewNodeManager.create(renderNode, env, attrs, options, parentView, null, null, template);
    state.manager = nodeManager;

    nodeManager.render(env, hash, visitor);
  }
};

function isEmpty(outletState) {
  return !outletState || (!outletState.render.ViewClass && !outletState.render.template);
}

function isStable(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  a = a.render;
  b = b.render;
  for (let key in a) {
    if (a.hasOwnProperty(key)) {
      // Name is only here for logging & debugging. If two different
      // names result in otherwise identical states, they're still
      // identical.
      if (a[key] !== b[key] && key !== 'name') {
        return false;
      }
    }
  }
  return true;
}
