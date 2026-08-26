# ConeSortium

A *sortium* (n.): a distinguished assembly of esteemed members. In this case, the
esteemed members are all traffic cones.

This is a ROS 2 workspace that gathers, in one place, every cone-related package I
kept rewriting "just one more time." Because nothing in autonomous racing matters more
than correctly noticing the yellow or blue plastic objects that are very deliberately *not*
trying to move. The cones, at least, are reliable. They stay where you put them. They
do not drift. They are, frankly, the most dependable part of the entire pipeline.

Everything here lives as a git submodule, so the workspace is mostly an opinionated
list of links to repos that each individually claim to be the important one.

## The members

| Package | Submodule | What it actually does |
|---|---|---|
| **cuCONERUSH** | [`src/cudaCONERUSH`](src/cudaCONERUSH) | GPU-first LiDAR cone detection. Turns a point cloud into cone markers without ever leaving the GPU, because asking the CPU to help would be embarrassing. |
| **cone_poser** | [`src/ConePoser`](src/ConePoser) | Takes clustered cones and an odometry pose, multiplies two transforms together, and places the cones in a global frame. Yes, that is the whole package. It does it well. |
| **cuCONEFUSED** | [`src/cudaCONEFUSED`](src/cudaCONEFUSED) | Cone-based EKF-SLAM. Uses the cones — which, unlike your odometry, refuse to drift — to drag FAST-LIMO back to reality. |
| **cuCONESTELLATION** | [`src/cudaCONESTELLATION`](src/cudaCONESTELLATION) | The local planner. Triangulates the cone map and grows a centerline through it, in four different implementations that all agree byte-for-byte and disagree about everything else. |

### cuCONERUSH — `cuda_cone_rush`
The detection front-end. The pipeline stays on CUDA buffers the entire way through:

```text
PointCloud2 -> optional XYZ filter -> optional ground segmentation -> optional voxel clustering -> cone markers
```

Filtering, RANSAC ground segmentation, voxel clustering and cone-dimension filtering,
all on the GPU. Benchmarks range from a leisurely 10 ms on an Orin Nano Super to a
borderline-rude 1.1 ms on an RTX 4060 Mobile. Since the last time anyone updated this
file it has acquired x86 fixes, pinned host memory promoted from "experimental" to
"fine, actually", latency instrumentation, and a set of parameters described in the
commit log as *optimal* — including the discovery that `maxHeight` must stay above the
ground plane at maximum range, or far cones are silently dropped and everyone spends an
afternoon blaming the clustering. Cluster markers now carry the **sensor's** timestamp
rather than whenever the node got around to it, which matters enormously to the two
downstream packages that thought they were being fused in the right order.

The README also still ships a real crash log under a heading called `TODO`, which
remains the most honest section in this entire workspace.

### cone_poser — `cone_poser`
The middle child. It does exactly one matrix multiply:

$$T_{global} = T_{odom} \cdot T_{marker}$$

and it does not pretend otherwise. Cones come in local, cones go out global. No
filtering, no fusion, no drama. One commit, ever, called `first commit`. Sometimes you
just need the cones *somewhere else*.

### cuCONEFUSED — `cuda_cone_fused`
The clever one. An EKF-SLAM node that treats FAST-LIMO/FAST-LIO odometry as a purely
*relative* motion source and the track's static cones as landmarks. The result is an
`/Odometry` pose in the `track` frame that, from the second lap onward, snaps onto the
cone map and stops drifting — the cones quietly correcting the expensive sensor's
self-confidence.

It has since grown up considerably:

- **Two regimes, on purpose.** Lap 1 builds the map with the pose gain zeroed
  (`freeze_pose_first_lap`); from lap 2 the map is rigid and only the $3\times3$ pose
  block is updated (`freeze_map`). Both are switchable to the legacy full-SLAM
  behaviour, which is available for anyone who enjoys watching a map slowly rotate over
  many laps.
- **A CUDA backend** (`USE_CUDA`, default `ON`), which keeps $\mathbf{P}$ and
  $\mathbf{x}$ resident on the device for the entire run so the $n \times n$ covariance
  never crosses the bus. The full-map update goes from ~15 ms on a CPU core to a median
  ~1.3 ms on an Orin Nano. `USE_CUDA=OFF` still builds the honest, slow, CUDA-free
  version, for debugging and for humility.
- **A layered refactor**: ROS-free filter core, inbound adapters, a backend Bridge,
  outbound publishers, and a command queue that applies measurements in *timestamp*
  order instead of arrival order — because the alternative was pretending that
  out-of-sequence measurements do not exist.
- Plus LIMO calibration, first-iteration warmup, first-lap stability work, and one
  commit titled `apparently the INF fix was not a fix`.

Its README is nearly 600 lines with numbered sections and derivations. It is less a
README than a thesis with a rosbag.

### cuCONESTELLATION — `cuda_cone_stellation`
The newest member, and the one that finally does something *with* the cones instead of
merely admiring them. It takes the SLAM cone map, Delaunay-triangulates it, and grows a
centerline — called, without irony, the **Way** — one midpoint at a time.

Almost all of the runtime is that midpoint search, which exists in four interchangeable
backends that produce **byte-identical Ways** and differ only in how much of your Orin
they set on fire:

| `search_backend` | wall / callback | CPU / callback | core @ 20 Hz |
|---|---|---|---|
| `cpu` | 46.5 ms | 46.5 ms | 93% |
| `cpu-fast` *(default)* | 11.8 ms | 11.6 ms | 23% |
| `cuda` | 16.6 ms | 2.8 ms | 5.6% |
| `cuda-one-shot-search` | 13.1 ms | **0.39 ms** | **0.8%** |

The last one moves the outer loop onto the device too, so it is one kernel launch per
callback instead of twenty, and spends its time *blocking* rather than *working* —
handing the CPU core back to everything else that would like a turn. The original `cpu`
backend is kept frozen purely so the other three can be proven identical to it, which
is a generous way of describing "too slow to deploy, too useful to delete."

Two other findings are worth the reader's time: the diagnostic log line now costs more
than the search it is measuring, and you must **not** validate this with `ros2 bag play`
into a live node — cones at 20 Hz on a `KeepLast(1)` subscription versus odometry at
100 Hz means two runs of the *same* backend produce different Ways. There is a
`search_bench` for exactly this reason.

## Getting it all

```bash
git clone --recurse-submodules <this-repo>
# or, if you already cloned and forgot (you did):
git submodule update --init --recursive
```

## Building

Standard ROS 2 (Humble) workspace. Build the whole sortium, or pick your favourite member:

```bash
colcon build                                          # all of them
colcon build --packages-select cuda_cone_rush         # just one
colcon build --packages-select cuda_cone_stellation \
    --cmake-args -DUSE_CUDA=ON -DBUILD_BENCH=ON       # one, with opinions
source install/setup.bash
```

Three of the four would like a CUDA toolkit and a GPU that actually exists and is
addressable (see aforementioned honest `TODO` section). `cuda_cone_rush` additionally
wants PCL. `cuda_cone_fused` and `cuda_cone_stellation` will both fall back to CPU
builds if asked nicely via CMake, and `cuda_cone_stellation` will fall back at *runtime*
too if you configure a search whose frontier would not fit on the device — it warns and
retreats to the host rather than quietly truncating your racing line.

`cone_poser` is content with a CPU and modest expectations.

## License

Per-package, in each submodule. The cones themselves remain unlicensed and at large.
