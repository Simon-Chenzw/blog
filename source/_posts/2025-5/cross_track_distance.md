---
title: Cross-track distance in WGS84
date: 2025-05-05 18:00:00
categories: Mathematics
tags:
    - Geometry
    - Geography
excerpt: The cross-track distance (or cross-track error) is the distance of a point from a great-circle path.
---

## Description

The cross-track distance (or cross-track error) is the distance of a point from a great-circle path.
The great circle path is defined by a and b, while p is the point away from the path.

## Background

[[Wikipedia] Ramer–Douglas–Peucker algorithm](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm)

![https://commons.wikimedia.org/wiki/File:Douglas-Peucker_animated.gif](Douglas-Peucker_animated.gif)

Cross-track distance is used in the line segment simplification algorithm to measure the importance of this point to the shape of the line segment.

```python
from typing import *

from typing_extensions import TypeAlias

Point: TypeAlias = Tuple[float, float]
CTDFunc: TypeAlias = Callable[[Point, Point, Point], float]


def simplify(points: Sequence[Point], ctd: CTDFunc, threshold: float) -> List[Point]:
    if len(points) < 3:
        return list(points)

    max_dis = ctd(points[0], points[-1], points[1])
    max_dis_idx = 2
    for idx, p in enumerate(points[2:-1]):
        dis = ctd(points[0], points[-1], p)
        if max_dis is None or dis > max_dis:
            max_dis = dis
            max_dis_idx = idx + 2

    if max_dis < threshold:
        return [points[0], points[-1]]
    else:
        left = simplify(points[: max_dis_idx + 1], ctd, threshold)
        right = simplify(points[max_dis_idx:], ctd, threshold)
        return left[:-1] + right
```


## Pseudo-Mercator

We can project the coordinate points into a 2-d coordinate system with meters as units to facilitate calculation. 

[[Wikipedia] Mercator projection](https://en.wikipedia.org/wiki/Mercator_projection)
[[Wikipedia] Web Mercator projection](https://en.wikipedia.org/wiki/Web_Mercator_projection)
[[epsg] WGS 84 / Pseudo-Mercator](https://epsg.io/3857)

[[PyProj] proj](https://pyproj4.github.io/pyproj/3.5.0/api/proj.html)

```python
import math


def euclidean_cross_track_distance(a: Point, b: Point, p: Point) -> float:
    l2 = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
    if l2 == 0.0:
        return math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2)
    t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2
    if t < 0.0:
        return math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2)
    elif t > 1.0:
        return math.sqrt((p[0] - b[0]) ** 2 + (p[1] - b[1]) ** 2)
    else:
        return math.sqrt(
            (p[0] - (a[0] + t * (b[0] - a[0]))) ** 2 + (p[1] - (a[1] + t * (b[1] - a[1]))) ** 2
        )
```

However, any projection will have a certain degree of distortion, which may lead to errors in the results.

![https://commons.wikimedia.org/wiki/File:Worlds_animate.gif](Worlds_animate.gif)

## Spherical geometry

[[Wikipedia] Figure of the Earth](https://en.wikipedia.org/wiki/Figure_of_the_Earth#Sphere)

> The simplest model for the shape of the entire Earth is a sphere.
> The Earth's radius is the distance from Earth's center to its surface, about 6,371 km (3,959 mi).

[[Wikipedia] Earth radius](https://en.wikipedia.org/wiki/Earth_radius)

> A globally-average value is usually considered to be 6,371 kilometres (3,959 mi) with a 0.3% variability (±10 km) for the following reasons.

[[Movable Type] Mathematical formulas](https://www.movable-type.co.uk/scripts/latlong.html#cross-track)
[[Movable Type] Original javascript codes](https://www.movable-type.co.uk/scripts/latlong.html#latlon-src)

```python
R = 6371e3


def distance(p1: Point, p2: Point) -> float:
    lon1, lat1 = math.radians(p1[0]), math.radians(p1[1])
    lon2, lat2 = math.radians(p2[0]), math.radians(p2[1])
    delta_lon = lon2 - lon1
    delta_lat = lat2 - lat1
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def initialBearing(p1: Point, p2: Point) -> float:
    lon1, lat1 = math.radians(p1[0]), math.radians(p1[1])
    lon2, lat2 = math.radians(p2[0]), math.radians(p2[1])
    delta_lon = lon2 - lon1
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(delta_lon)
    y = math.sin(delta_lon) * math.cos(lat2)
    theta = math.atan2(y, x)
    return math.degrees(theta) % 360


def spherical_cross_track_distance(a: Point, b: Point, p: Point) -> float:
    if p == a:
        return 0.0

    delta_13 = distance(a, p) / R
    theta_13 = math.radians(initialBearing(a, p))
    theta_12 = math.radians(initialBearing(a, b))
    delta_xt = math.asin(math.sin(delta_13) * math.sin(theta_13 - theta_12))
    return abs(delta_xt) * R
```

## WGS84

[[Wikipedia] World Geodetic System 84](https://en.wikipedia.org/wiki/World_Geodetic_System#WGS_84)
[[epsg] World Geodetic System 1984](https://epsg.io/4326)

So how do we calculate the cross-track distance on the real Earth?
The formula is quite complicated to derive, and I haven't found any proof online.
However, since the distance from a given point to a point on a given great circle is a unimodal function, we can use a ternary search to find the cross-track distance.

[[Wikipedia]Ternary search](https://en.wikipedia.org/wiki/Ternary_search)
[[Wikipedia]Golden-section search](https://en.wikipedia.org/wiki/Golden-section_search)
[[PyProj] geod](https://pyproj4.github.io/pyproj/3.5.0/api/geod.html)

```python
import pyproj

geod = pyproj.Geod(ellps="WGS84")
INV_PHI = (math.sqrt(5) - 1) / 2


def wgs84_cross_track_distance(a: Point, b: Point, p: Point) -> float:
    azi, _, dist = geod.inv(a[0], a[1], b[0], b[1])

    def func(x: float) -> float:
        lon, lat, _ = geod.fwd(a[0], a[1], azi, x)
        return geod.inv(lon, lat, p[0], p[1])[2]

    x1, x4 = 0, dist
    x2 = x4 - (x4 - x1) * INV_PHI
    x3 = x1 + (x4 - x1) * INV_PHI
    y2, y3 = func(x2), func(x3)

    while x4 - x1 > 0.1: # NOTE decimetre accuracy
        if y2 < y3:
            x4 = x3
            x3, y3 = x2, y2
            x2 = x4 - (x4 - x1) * INV_PHI
            y2 = func(x2)
        else:
            x1 = x2
            x2, y2 = x3, y3
            x3 = x1 + (x4 - x1) * INV_PHI
            y3 = func(x3)

    return y2
```

## Comparison

The following table compares the cross-track distance from Shanghai to the great circle path from Beijing to Guangzhou.

| coordinate system          | cross-track distance | absolute error | percentage error | time      |
|----------------------------|----------------------|----------------|------------------|-----------|
| Pseudo-Mercator            | 745,163  meters      | 104,019 meters | 16.22%           | 1.05 μs   |
| sphere with 6371 km radius | 639,907 meters       | 1,235 meters   | 0.19%            | 4.13 μs   |
| World Geodetic System 1984 | 641,143 meters       | -              | -                | 103.85 μs |

### Model Error

```python
BEIJING = 116.383331, 39.916668
SHANGHAI = 121.469170, 31.224361
GUANGZHOU = 113.253250, 23.128994

proj = pyproj.Transformer.from_crs(pyproj.CRS("EPSG:4326"), pyproj.CRS("EPSG:3857"), always_xy=True)

BEIJING_WEB = proj.transform(*BEIJING)
SHANGHAI_WEB = proj.transform(*SHANGHAI)
GUANGZHOU_WEB = proj.transform(*GUANGZHOU)

wgs_dis = wgs84_cross_track_distance(BEIJING, GUANGZHOU, SHANGHAI)
print("wgs84", wgs_dis)  # 641143.0400424004

mer_dis = euclidean_cross_track_distance(BEIJING_WEB, GUANGZHOU_WEB, SHANGHAI_WEB)
print("mercator distance", mer_dis)  # 745162.7774014509
print("mercator absolute error", abs(mer_dis - wgs_dis))  # 104019.73735905054
print("mercator percentage error", f"{abs(mer_dis - wgs_dis) / wgs_dis:.2%}")  # 16.22%

sph_dis = spherical_cross_track_distance(BEIJING, GUANGZHOU, SHANGHAI)
print("spherical distance", sph_dis)  # 639907.0625296788
print("spherical absolute error", abs(sph_dis - wgs_dis))  # 1235.9775127215544
print("spherical percentage error", f"{abs(sph_dis - wgs_dis) / wgs_dis:.2%}")  # 0.19%
```

### Performance

```python
import timeit


def mercator_test():
    mercator_cross_track_distance(BEIJING_WEB, GUANGZHOU_WEB, SHANGHAI_WEB)


def spherical_test():
    spherical_cross_track_distance(BEIJING, GUANGZHOU, SHANGHAI)


def wgs84_test():
    wgs84_cross_track_distance(BEIJING, GUANGZHOU, SHANGHAI)


print(timeit.repeat(mercator_test, number=100_000))
# [0.10327953612431884, 0.1098200329579413, 0.1052641540300101, 0.10346574615687132, 0.10463364492170513]
print(timeit.repeat(spherical_test, number=100_000))
# [0.42603984801098704, 0.4110173638910055, 0.41040319413878024, 0.40825760504230857, 0.4094074049498886]
print(timeit.repeat(wgs84_test, number=100_000))
# [10.390001660212874, 10.618584153009579, 10.517124665901065, 10.232913487125188, 10.16413514316082]
```

## Additional optimization

The Ramer-Douglas-Peucker algorithm does not need to calculate the specific value of each point.
It only needs to know whether there are points exceeding the threshold and where the farthest point is.
So we can prune the ternary search process to a certain extent.

For example, if the distance from a point to the endpoint of a line segment is less than the simplification threshold, it can be inferred that the cross-track distance of the point must also be less than the threshold.

If there are a large number of points in the line to be simplified, pruning may significantly speed up the calculation.
