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
| **cone_fused** | [`src/ConeFused`](src/ConeFused) | Cone-based EKF-SLAM. Uses the cones — which, unlike your odometry, refuse to drift — to drag FAST-LIMO back to reality. |

### cuCONERUSH — `cuda_cone_rush`
The detection front-end. The pipeline stays on CUDA buffers the entire way through:

```text
PointCloud2 -> optional XYZ filter -> optional ground segmentation -> optional voxel clustering -> cone markers
```

Filtering, RANSAC ground segmentation, voxel clustering and cone-dimension filtering,
all on the GPU. Benchmarks range from a leisurely 10 ms on an Orin Nano Super to a
borderline-rude 1.1 ms on an RTX 4060 Mobile. The README also ships a real crash log
under a heading called `TODO`, which is the most honest section in this entire workspace.

### cone_poser — `cone_poser`
The middle child. It does exactly one matrix multiply:

$$T_{global} = T_{odom} \cdot T_{marker}$$

and it does not pretend otherwise. Cones come in local, cones go out global. No
filtering, no fusion, no drama. Sometimes you just need the cones *somewhere else*.

### cone_fused — `cone_fused`
The clever one. An EKF-SLAM node that treats FAST-LIMO/FAST-LIO odometry as a purely
*relative* motion source and the track's static cones as landmarks. The result is an
`/Odometry` pose in the `track` frame that, from the second lap onward, snaps onto the
cone map and stops drifting — the cones quietly correcting the expensive sensor's
self-confidence.

## Getting it all

```bash
git clone --recurse-submodules <this-repo>
# or, if you already cloned and forgot (you did):
git submodule update --init --recursive
```

## Building

Standard ROS 2 (Humble) workspace. Build the whole sortium, or pick your favourite member:

```bash
cd <your_ros2_ws>
colcon build                                   # all of them
colcon build --packages-select cuda_cone_rush  # just one
source install/setup.bash
```

Note that `cuda_cone_rush` would like a CUDA Toolkit, PCL, and a GPU that actually
exists and is addressable (see aforementioned honest `TODO` section). The other two are
content with a CPU and modest expectations.

## License

Per-package, in each submodule. The cones themselves remain unlicensed and at large.
