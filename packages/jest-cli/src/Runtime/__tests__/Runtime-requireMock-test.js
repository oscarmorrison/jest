/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails oncall+jsinfra
 */
'use strict';

jest.disableAutomock();
jest.mock(
  'jest-environment-jsdom',
  () => require('../../../__mocks__/jest-environment-jsdom')
);

let createRuntime;

describe('Runtime', () => {

  beforeEach(() => {
    createRuntime = require('createRuntime');
  });

  describe('requireMock', () => {
    pit('uses manual mocks before attempting to automock', () =>
      createRuntime(__filename).then(runtime => {
        const exports = runtime.requireMock(
          runtime.__mockRootPath,
          'ManuallyMocked'
        );
        expect(exports.isManualMockModule).toBe(true);
      })
    );

    pit('can resolve modules that are only referenced from mocks', () =>
      createRuntime(__filename).then(runtime => {
        const exports = runtime.requireMock(
          runtime.__mockRootPath,
          'ManuallyMocked'
        );
        expect(
          exports.onlyRequiredFromMockModuleValue
        ).toBe('banana banana banana');
      })
    );

    pit('stores and re-uses manual mock exports', () =>
      createRuntime(__filename).then(runtime => {
        let exports = runtime.requireMock(
          runtime.__mockRootPath,
          'ManuallyMocked'
        );
        exports.setModuleStateValue('test value');
        exports = runtime.requireMock(runtime.__mockRootPath, 'ManuallyMocked');
        expect(exports.getModuleStateValue()).toBe('test value');
      })
    );

    pit('automocks @providesModule modules without a manual mock', () =>
      createRuntime(__filename).then(runtime => {
        const exports = runtime.requireMock(
          runtime.__mockRootPath,
          'RegularModule'
        );
        expect(exports.getModuleStateValue._isMockFunction).toBe(true);
      })
    );

    pit('automocks relative-path modules without a file extension', () =>
      createRuntime(__filename).then(runtime => {
        const exports = runtime.requireMock(
          __filename,
          './test_root/RegularModule'
        );
        expect(exports.getModuleStateValue._isMockFunction).toBe(true);
      })
    );

    pit('automocks relative-path modules with a file extension', () =>
      createRuntime(__filename).then(runtime => {
        const exports = runtime.requireMock(
          __filename,
          './test_root/RegularModule.js'
        );
        expect(exports.getModuleStateValue._isMockFunction).toBe(true);
      })
    );

    pit('just falls back when loading a native module', () =>
      createRuntime(__filename).then(runtime => {
        let error;
        // Okay so this is a really WAT way to test this, but we
        // are going to require an empty .node file which should
        // throw an error letting us know that the file is too
        // short. If it does not (it gives another error) then we
        // are not correctly falling back to 'native' require.
        try {
          runtime.requireMock(
            __filename,
            './test_root/NativeModule.node'
          );
        } catch (e) {
          error = e;
        } finally {
          expect(error.message).toMatch(
            /NativeModule.node\: file too short|not a valid Win\d+ application/
          );
        }
      })
    );

    pit('stores and re-uses automocked @providesModule exports', () =>
      createRuntime(__filename).then(runtime => {
        let exports = runtime.requireMock(
          runtime.__mockRootPath,
          'RegularModule'
        );
        exports.externalMutation = 'test value';
        exports = runtime.requireMock(runtime.__mockRootPath, 'RegularModule');
        expect(exports.externalMutation).toBe('test value');
      })
    );

    pit('stores and re-uses automocked relative-path modules', () =>
      createRuntime(__filename).then(runtime => {
        let exports = runtime.requireMock(
          __filename,
          './test_root/RegularModule'
        );
        exports.externalMutation = 'test value';
        exports = runtime.requireMock(
          __filename,
          './test_root/RegularModule'
        );
        expect(exports.externalMutation).toBe('test value');
      })
    );

    pit('multiple node core modules returns correct module', () =>
      createRuntime(__filename).then(runtime => {
        runtime.requireMock(runtime.__mockRootPath, 'fs');
        expect(
          runtime.requireMock(runtime.__mockRootPath, 'events').EventEmitter
        ).toBeDefined();
      })
    );

    pit('throws on non-existent @providesModule modules', () =>
      createRuntime(__filename).then(runtime => {
        expect(() => {
          runtime.requireMock(runtime.__mockRootPath, 'DoesntExist');
        }).toThrow();
      })
    );

    pit('uses the closest manual mock when duplicates exist', () =>
      createRuntime(__filename).then(runtime => {
        const exports1 = runtime.requireMock(
          runtime.__mockRootPath,
          './subdir1/MyModule'
        );
        expect(exports1.modulePath).toEqual(
          'subdir1/__mocks__/MyModule.js'
        );

        const exports2 = runtime.requireMock(
          runtime.__mockRootPath,
          './subdir2/MyModule'
        );
        expect(exports2.modulePath).toEqual(
          'subdir2/__mocks__/MyModule.js'
        );
      })
    );
  });
});