const featureEdges = {
  catalog: ['cart', 'policy'],
  cart: ['policy'],
  checkout: ['cart', 'auth', 'policy'],
  orders: ['checkout', 'auth', 'policy'],
  auth: [],
  policy: [],
  home: ['catalog', 'policy'],
  shell: ['cart', 'auth', 'catalog', 'policy'],
  admin: ['auth', 'policy']
}

const edgeRules = Object.entries(featureEdges).map(([feature, allowed]) => ({
  name: `feature-edge-${feature}`,
  severity: 'error',
  from: { path: `^src/features/${feature}/` },
  to: { path: '^src/features/[^/]+/', pathNot: [`^src/features/(${[feature, ...allowed].join('|')})/`] }
}))

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'no-deep-import-into-another-feature',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/([^/]+)/', pathNot: ['^src/features/$1/', '^src/features/[^/]+/index\\.tsx?$'] }
    },
    ...edgeRules,
    {
      name: 'shared-imports-nothing-above-it',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/(features|app)/' }
    },
    {
      name: 'app-is-imported-only-by-main',
      severity: 'error',
      from: { pathNot: '(^src/(main\\.tsx|app/|test/)|\\.test\\.tsx?$)' },
      to: { path: '^src/app/' }
    },
    {
      name: 'no-dumping-ground-folders',
      severity: 'error',
      from: {},
      to: { path: '(^|/)(utils|helpers|common|hooks)/' }
    },
    {
      name: 'production-code-does-not-import-tests',
      severity: 'error',
      from: { pathNot: '(\\.test\\.tsx?$|^src/test/)' },
      to: { path: '(\\.test\\.tsx?$|^src/test/)' }
    },
    {
      name: 'no-deprecated-dependencies',
      severity: 'warn',
      from: {},
      to: { dependencyTypes: ['deprecated'] }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.app.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default', 'types'] }
  }
}
