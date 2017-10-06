/* global AFRAME, THREE */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

/**
 * Implement AABB collision detection for entities with a mesh.
 * https://en.wikipedia.org/wiki/Minimum_bounding_box#Axis-aligned_minimum_bounding_box
 *
 * @property {string} objects - Selector of entities to test for collision.
 */
AFRAME.registerComponent('aabb-collider', {
  schema: {
    objects: {default: ''}
  },

  init: function () {
    this.clearedIntersectedEls = [];
    this.boundingBox = new THREE.Box3();
    this.boxMax = new THREE.Vector3();
    this.boxMin = new THREE.Vector3();
    this.intersectedEls = [];
    this.objectEls = [];
    this.newIntersectedEls = [];
    this.previousIntersectedEls = [];

    this.hitStartEventDetail = {intersectedEls: this.newIntersectedEls};
  },

  /**
   * Update list of entities to test for collision.
   */
  update: function (oldData) {
    var el = this.el;
    var data = this.data;
    var objectEls;
    var els;

    // Push entities into list of els to intersect.
    if (oldData.objects !== data.objects) {
      els = el.sceneEl.querySelectorAll(data.objects);
      for (i = 0; i < els.length; i++) {
        if (els[i] === el) { continue; }
        this.objectEls.push(els[i]);
      }
    } else {
      // If objects not defined, intersect with everything.
      this.objectEls = el.sceneEl.children;
    }
  },

  tick: function (t) {
    var boundingBox = this.boundingBox;
    var clearedIntersectedEls = this.clearedIntersectedEls;
    var intersectedEls = this.intersectedEls;
    var el = this.el;
    var i;
    var mesh;
    var newIntersectedEls = this.newIntersectedEls;
    var objectEls = this.objectEls;
    var previousIntersectedEls = this.previousIntersectedEls;
    var self = this;

    // No mesh, no collisions
    mesh = el.getObject3D('mesh');
    if (!mesh) { return; }

    // Update the bounding box to account for rotations and position changes.
    boundingBox.setFromObject(mesh);
    this.boxMin.copy(boundingBox.min);
    this.boxMax.copy(boundingBox.max);

    copyArray(previousIntersectedEls, intersectedEls);

    // Populate intersectedEls array.
    intersectedEls.length = 0;
    for (i = 0; i < objectEls.length; i++) {
      if (this.isIntersecting(objectEls[i])) {
        intersectedEls.push(objectEls[i]);
      }
    }

    newIntersectedEls.length = 0;
    for (i = 0; i < intersectedEls.length; i++) {
      if (previousIntersectedEls.indexOf(intersectedEls[i]) === -1) {
        newIntersectedEls.push(intersectedEls[i]);
      }
    }


    // Emit cleared events on no longer intersected entities.
    clearedIntersectedEls.length = 0;
    for (i = 0; i < previousIntersectedEls.length; i++) {
      if (intersectedEls.indexOf(previousIntersectedEls[i]) === -1) {
        if (!previousIntersectedEls[i].hasAttribute('aabb-collider')) {
          previousIntersectedEls[i].emit('hitend');
          previousIntersectedEls[i].emit('raycaster-intersected-cleared');
        }
        clearedIntersectedEls.push(previousIntersectedEls[i]);
      }
    }

    // Emit events on intersected entities.
    for (i = 0; i < newIntersectedEls.length; i++) {
      if (!newIntersectedEls[i].hasAttribute('aabb-collider')) {
        newIntersectedEls[i].emit('hitstart');
        newIntersectedEls[i].emit('raycaster-intersected');
      }
    }

    if (clearedIntersectedEls.length) {
      el.emit('hitend');
      el.emit('raycaster-intersection-cleared');
    }

    if (newIntersectedEls.length) {
      el.emit('hitstart', this.hitStartEventDetail);
      el.emit('raycaster-intersection');
    }
  },

  /**
   * AABB collision detection.
   * 3D version of https://www.youtube.com/watch?v=ghqD3e37R7E
   */
  isIntersecting: (function () {
    var boundingBox = new THREE.Box3();

    return function (el) {
      var isIntersecting;
      var mesh;
      var boxMin;
      var boxMax;

      mesh = el.getObject3D('mesh');
      if (!mesh) { return; }

      boundingBox.setFromObject(mesh);
      boxMin = boundingBox.min;
      boxMax = boundingBox.max;
      return (this.boxMin.x <= boxMax.x && this.boxMax.x >= boxMin.x) &&
             (this.boxMin.y <= boxMax.y && this.boxMax.y >= boxMin.y) &&
             (this.boxMin.z <= boxMax.z && this.boxMax.z >= boxMin.z);
    };
  })()
});

function copyArray (dest, source) {
  var i;
  dest.length = 0;
  for (i = 0; i < source.length; i++) {
    dest[i] = source[i];
  }
}
