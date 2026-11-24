import { io } from 'socket.io-client';
import { createServer } from './src/server.js';

// Simple ANSI color helpers
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const blue = (s) => `\x1b[34m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

function createClient(url) {
  return io(url, {
    transports: ['polling', 'websocket'],
    forceNew: true,
    reconnection: false,
  });
}

function waitForConnect(socket, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    if (socket.connected) return resolve();
    const timer = setTimeout(() => reject(new Error('Socket connection timeout')), timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Socket connect_error: ${err.message}`));
    });
  });
}

// Helper to wait for a specific socket event with a timeout
function waitForEvent(socket, eventName, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout waiting for event '${eventName}' after ${timeoutMs}ms`));
    }, timeoutMs);

    const handler = (data) => {
      clearTimeout(timer);
      socket.off(eventName, handler);
      resolve(data);
    };

    socket.on(eventName, handler);
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log(bold('\n======================================================'));
  console.log(bold('  YouTube Watch Party E2E Automated Test Suite'));
  console.log(bold('======================================================\n'));

  const PORT = 5099;
  const { server } = createServer();

  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  const serverUrl = `http://127.0.0.1:${PORT}`;
  console.log(blue(`[*] Test server running at ${serverUrl}`));

  let hostSocket;
  let participantSocket;
  let viewerSocket;
  let createdRoomId;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Room Creation & Joining with Roles
    // -------------------------------------------------------------------------
    console.log(bold('\n[TEST 1] Room creation (Host) & Joining (Participant)...'));

    hostSocket = createClient(serverUrl);
    await waitForConnect(hostSocket);

    // Host creates a room (omits roomId)
    const hostJoinPromise = waitForEvent(hostSocket, 'room_joined');
    hostSocket.emit('join_room', { username: 'AliceHost', userId: 'user_alice' });
    const hostJoinedData = await hostJoinPromise;

    if (hostJoinedData.role !== 'host') {
      throw new Error(`Expected AliceHost to be 'host', got '${hostJoinedData.role}'`);
    }
    if (!hostJoinedData.roomId || hostJoinedData.roomId.length !== 6) {
      throw new Error(`Expected valid 6-char roomId, got '${hostJoinedData.roomId}'`);
    }
    createdRoomId = hostJoinedData.roomId;
    console.log(`  -> Room created with code: ${green(createdRoomId)}`);
    console.log(`  -> Host joined with role: ${green(hostJoinedData.role)}`);

    // Participant joins the existing room
    participantSocket = createClient(serverUrl);
    await waitForConnect(participantSocket);

    const participantJoinPromise = waitForEvent(participantSocket, 'room_joined');
    participantSocket.emit('join_room', {
      roomId: createdRoomId,
      username: 'BobParticipant',
      userId: 'user_bob',
    });
    const bobJoinedData = await participantJoinPromise;

    if (bobJoinedData.role !== 'participant') {
      throw new Error(`Expected Bob to be 'participant', got '${bobJoinedData.role}'`);
    }
    console.log(`  -> Participant joined with role: ${green(bobJoinedData.role)}`);
    console.log(green('✔ TEST 1 PASSED: Room creation and role assignment verified.'));

    // -------------------------------------------------------------------------
    // TEST 2: Strict RBAC - Participant Unauthorized Actions Rejected
    // -------------------------------------------------------------------------
    console.log(bold('\n[TEST 2] Verifying strict RBAC rejects unauthorized playback actions...'));

    // Bob tries to play
    let deniedPromise = waitForEvent(participantSocket, 'permission_denied');
    participantSocket.emit('play', { roomId: createdRoomId, currentTime: 10 });
    let denied = await deniedPromise;
    if (denied.action !== 'play') {
      throw new Error(`Expected denied action 'play', got '${denied.action}'`);
    }
    console.log(`  -> Unauthorized 'play' rejected: ${green(denied.message)}`);

    // Bob tries to seek
    deniedPromise = waitForEvent(participantSocket, 'permission_denied');
    participantSocket.emit('seek', { roomId: createdRoomId, time: 120 });
    denied = await deniedPromise;
    if (denied.action !== 'seek') {
      throw new Error(`Expected denied action 'seek', got '${denied.action}'`);
    }
    console.log(`  -> Unauthorized 'seek' rejected: ${green(denied.message)}`);

    // Bob tries to change video
    deniedPromise = waitForEvent(participantSocket, 'permission_denied');
    participantSocket.emit('change_video', { roomId: createdRoomId, videoId: 'dQw4w9WgXcQ' });
    denied = await deniedPromise;
    if (denied.action !== 'change_video') {
      throw new Error(`Expected denied action 'change_video', got '${denied.action}'`);
    }
    console.log(`  -> Unauthorized 'change_video' rejected: ${green(denied.message)}`);
    console.log(green('✔ TEST 2 PASSED: All unauthorized mutations strictly blocked with permission_denied.'));

    // -------------------------------------------------------------------------
    // TEST 3: Participant Control Request & Host Approval Workflow
    // -------------------------------------------------------------------------
    console.log(bold('\n[TEST 3] Testing Request Control & Approval Workflow...'));

    const controlRequestedPromise = waitForEvent(hostSocket, 'control_requested');
    const newTargetVideo = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';

    // Bob requests video change
    participantSocket.emit('request_control', {
      roomId: createdRoomId,
      action: 'change_video',
      payload: { videoId: newTargetVideo },
      label: 'Requesting Lofi Chill beats',
    });

    const requested = await controlRequestedPromise;
    if (requested.request.requesterName !== 'BobParticipant') {
      throw new Error(`Expected requester 'BobParticipant', got '${requested.request.requesterName}'`);
    }
    console.log(`  -> Host received pending request: ${green(requested.request.label)} (ID: ${requested.request.requestId})`);

    // Host approves the request
    const syncStatePromise = waitForEvent(participantSocket, 'sync_state');
    const resolvedPromise = waitForEvent(hostSocket, 'control_request_resolved');

    hostSocket.emit('respond_control', {
      roomId: createdRoomId,
      requestId: requested.request.requestId,
      approve: true,
    });

    const resolved = await resolvedPromise;
    const syncState = await syncStatePromise;

    if (!resolved.approve) {
      throw new Error('Expected request to be approved');
    }
    if (syncState.videoId !== 'jfKfPfyJRdk') {
      throw new Error(`Expected videoId to update to 'jfKfPfyJRdk', got '${syncState.videoId}'`);
    }
    console.log(`  -> Request approved by Host and sync_state broadcast videoId: ${green(syncState.videoId)}`);
    console.log(green('✔ TEST 3 PASSED: Participant request and Host approval workflow verified.'));

    // -------------------------------------------------------------------------
    // TEST 4: Host Promotes Participant to Moderator -> Moderator Controls
    // -------------------------------------------------------------------------
    console.log(bold('\n[TEST 4] Promoting Participant to Moderator & testing Moderator controls...'));

    const roleAssignedPromise = waitForEvent(participantSocket, 'role_assigned');

    // Host assigns moderator role to Bob
    hostSocket.emit('assign_role', {
      roomId: createdRoomId,
      userId: 'user_bob',
      role: 'moderator',
    });

    const roleData = await roleAssignedPromise;
    if (roleData.role !== 'moderator' || roleData.userId !== 'user_bob') {
      throw new Error(`Expected role 'moderator' for user_bob, got '${roleData.role}'`);
    }
    console.log(`  -> User Bob promoted to role: ${green(roleData.role)}`);

    // Now Bob (Moderator) should be able to pause and seek directly!
    const pauseSyncPromise = waitForEvent(hostSocket, 'sync_state');
    participantSocket.emit('pause', { roomId: createdRoomId, currentTime: 45 });
    const pauseSync = await pauseSyncPromise;
    if (pauseSync.playState !== 'paused') {
      throw new Error(`Expected playState 'paused', got '${pauseSync.playState}'`);
    }
    console.log(`  -> Moderator successfully executed pause: ${green(pauseSync.playState)}`);

    const seekSyncPromise = waitForEvent(hostSocket, 'sync_state');
    participantSocket.emit('seek', { roomId: createdRoomId, time: 180 });
    const seekSync = await seekSyncPromise;
    if (seekSync.currentTime !== 180) {
      throw new Error(`Expected currentTime 180, got ${seekSync.currentTime}`);
    }
    console.log(`  -> Moderator successfully executed seek: ${green(seekSync.currentTime + 's')}`);
    console.log(green('✔ TEST 4 PASSED: Promotion to Moderator and playback controls verified.'));

    // -------------------------------------------------------------------------
    // TEST 5: Transfer Host and Kick Participant
    // -------------------------------------------------------------------------
    console.log(bold('\n[TEST 5] Testing Transfer Host and Kick User...'));

    // Connect a third user (Charlie)
    viewerSocket = createClient(serverUrl);
    await waitForConnect(viewerSocket);
    const charlieJoinPromise = waitForEvent(viewerSocket, 'room_joined');
    viewerSocket.emit('join_room', {
      roomId: createdRoomId,
      username: 'CharlieViewer',
      userId: 'user_charlie',
    });
    await charlieJoinPromise;
    console.log(`  -> Charlie joined room`);

    // Alice transfers host to Bob
    const hostTransferPromise = waitForEvent(participantSocket, 'role_assigned');
    hostSocket.emit('transfer_host', {
      roomId: createdRoomId,
      userId: 'user_bob',
    });

    const transferData = await hostTransferPromise;
    if (transferData.role !== 'host' || transferData.userId !== 'user_bob') {
      throw new Error(`Expected user_bob to become host, got ${JSON.stringify(transferData)}`);
    }
    console.log(`  -> Bob is now the new Host!`);

    // Now Bob (new host) kicks Charlie
    const kickedPromise = waitForEvent(viewerSocket, 'kicked');
    const removedBroadcastPromise = waitForEvent(hostSocket, 'participant_removed');

    participantSocket.emit('remove_participant', {
      roomId: createdRoomId,
      userId: 'user_charlie',
    });

    const kickedData = await kickedPromise;
    const removedData = await removedBroadcastPromise;

    if (removedData.userId !== 'user_charlie') {
      throw new Error(`Expected user_charlie to be removed, got ${removedData.userId}`);
    }
    console.log(`  -> Charlie received kicked event: ${green(kickedData.message)}`);
    console.log(`  -> Room received participant_removed: ${green(removedData.username)}`);
    console.log(green('✔ TEST 5 PASSED: Host transfer and participant removal verified.'));

    console.log(bold('\n======================================================'));
    console.log(bold(green('  ALL 5 E2E TESTS PASSED SUCCESSFULLY! (100%)')));
    console.log(bold('======================================================\n'));

  } catch (err) {
    console.error(bold(red(`\n✖ E2E TEST FAILED: ${err.message}`)));
    console.error(err);
    process.exitCode = 1;
  } finally {
    if (hostSocket) hostSocket.disconnect();
    if (participantSocket) participantSocket.disconnect();
    if (viewerSocket) viewerSocket.disconnect();
    server.close();
  }
}

runTests();
