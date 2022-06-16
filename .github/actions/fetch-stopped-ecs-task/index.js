const core = require('@actions/core');
const { main } = require('./main');

try {
  const appName = core.getInput('app');
  const waypointConfigFilePath = core.getInput('waypoint_hcl_path');

  const output = main(appName, waypointConfigFilePath);

  console.log(output);

  core.setOutput('has_stopped_task', String(output.has_stopped_task));
  core.setOutput('stopped_reason', output.stopped_reason || '');
  core.setOutput('logs_url', output.logs_url || '');
} catch (err) {
  core.setFailed(err.message);
  throw err;
}
