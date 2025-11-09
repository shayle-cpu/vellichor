// craco.config.js
/**
 * Silences the benign Supabase realtime-js warning:
 * "Critical dependency: the request of a dependency is an expression"
 */
module.exports = {
  webpack: {
    configure: (config) => {
      config.ignoreWarnings = [
        (warning) =>
          /Critical dependency: the request of a dependency is an expression/.test(
            warning.message || ""
          ) &&
          /@supabase[\\/]+realtime-js[\\/]+dist[\\/]+module[\\/]+lib[\\/]+websocket-factory\.js$/.test(
            (warning.module && warning.module.resource) || ""
          ),
      ];
      return config;
    },
  },
};
