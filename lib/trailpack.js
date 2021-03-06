'use strict'

module.exports = {

  /**
   * Index trailpacks by name
   */
  getTrailpackMapping (packs) {
    return packs.reduce((mapping, pack) => {
      mapping[pack.name] = pack
      return mapping
    }, { })
  },

  /**
   * Return all non-system trailpacks. As of v1.0, the only system trailpack is
   * "trailpack-core"
   */
  getUserlandTrailpacks (packs) {
    return packs.filter(pack => pack.name !== 'core')
  },

  /**
   * Bind lifecycle boundary event listeners. That is, when all trailpacks have
   * completed a particular phase, e.g. "configure" or "initialize", emit an
   * :all:<phase> event.
   */
  bindTrailpackPhaseListeners (app, packs) {
    const validatedEvents = packs.map(pack => `trailpack:${pack.name}:validated`)
    const configuredEvents = packs.map(pack => `trailpack:${pack.name}:configured`)
    const initializedEvents = packs.map(pack => `trailpack:${pack.name}:initialized`)

    app.after(configuredEvents)
      .then(() => app.emit('trailpack:all:configured'))
      .catch(err => app.stop(err))

    app.after(validatedEvents)
      .then(() => app.emit('trailpack:all:validated'))
      .catch(err => app.stop(err))

    app.after(initializedEvents)
      .then(() => {
        app.emit('trailpack:all:initialized')
        app.emit('trails:ready')
      })
      .catch(err => app.stop(err))
  },

  /**
   * Bind individual lifecycle method listeners. That is, when each trailpack
   * completes each lifecycle, fire individual events for those trailpacks.
   */
  bindTrailpackMethodListeners (app, packs) {
    packs.map(pack => {
      const lifecycle = pack.config.lifecycle

      app.after(lifecycle.initialize.listen.concat('trailpack:all:configured'))
        .then(() => pack.initialize())
        .then(() => app.emit(`trailpack:${pack.name}:initialized`))
        .catch(err => app.stop(err))

      app.after(lifecycle.configure.listen.concat('trailpack:all:validated'))
        .then(() => pack.configure())
        .then(() => app.emit(`trailpack:${pack.name}:configured`))
        .catch(err => app.stop(err))

      app.after('trails:start')
        .then(() => pack.validate())
        .then(() => app.emit(`trailpack:${pack.name}:validated`))
        .catch(err => app.stop(err))
    })
  }
}

