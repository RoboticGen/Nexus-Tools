"""
Obo Car Simulation Library
Pure-Python car model used by the OBO Playground's Python executor.

Motor-driver style API: forward()/backward()/left()/right() only prime a
speed - they don't move the car by themselves. sleep(seconds) is what
actually runs the primed motion for that duration (mirrors how you'd
drive a real motor: set_speed(), then hold it for a duration), and
automatically stops the motion once the duration elapses.

No visual/physics engine is attached - this library tracks position,
heading and simulated sensor readings only, and reports every action as
a structured event (in addition to a human-readable log line) so the
JS side can render a live console without re-implementing the car's math.

This is the single canonical copy of the obocar library. Do not duplicate
it elsewhere - see @nexus-tools/obocar-wrapper for the matching TS event
types (CarEvent) that describe the JSON emitted below.
"""
import json
import math
import random
import time

# Linear speed=100 covers this many units per second; degrees_per_sec
# scales the same way for turning. Kept as plain named constants since
# there's no physical scene to calibrate against - only console output.
UNITS_PER_SECOND_AT_SPEED_100 = 1.0
DEGREES_PER_SECOND_AT_SPEED_100 = 18.0


def _emit(event_type, **data):
    """Emit a structured event as a sentinel-tagged stdout line."""
    event = {"type": event_type, "timestamp": time.time(), **data}
    print("@@EVENT@@" + json.dumps(event))


class OboCar:
    """Main vehicle class for the Obo Car simulation."""

    def __init__(self):
        self.position = [0.0, 0.0]
        self.heading = 0.0
        self.total_distance = 0.0
        self.sensor_range = 20.0
        self._pending = None  # primed motion: {"action": ..., "speed": ...}
        _emit("reset", position=self.get_position(), heading=self.get_heading())

    def forward(self, speed=50):
        """Prime the car to drive forward at the given speed (0-100). Call sleep() to run it."""
        print(f"Ready to move forward at speed {speed}")
        self._pending = {"action": "forward", "speed": speed}

    def backward(self, speed=50):
        """Prime the car to drive backward at the given speed (0-100). Call sleep() to run it."""
        print(f"Ready to move backward at speed {speed}")
        self._pending = {"action": "backward", "speed": speed}

    def left(self, speed=50):
        """Prime the car to turn left at the given speed (0-100). Call sleep() to run it."""
        print(f"Ready to turn left at speed {speed}")
        self._pending = {"action": "left", "speed": speed}

    def right(self, speed=50):
        """Prime the car to turn right at the given speed (0-100). Call sleep() to run it."""
        print(f"Ready to turn right at speed {speed}")
        self._pending = {"action": "right", "speed": speed}

    def sleep(self, seconds):
        """
        Run whatever motion was primed by forward()/backward()/left()/right()
        for the given number of seconds, then stop. With nothing primed,
        this is just a plain pause.
        """
        if self._pending is None:
            print(f"Waiting {seconds}s (nothing primed)...")
            time.sleep(seconds)
            return

        action, speed = self._pending["action"], self._pending["speed"]
        self._pending = None

        if action in ("forward", "backward"):
            distance = speed / 100.0 * UNITS_PER_SECOND_AT_SPEED_100 * seconds
            if action == "backward":
                distance = -distance
            print(f"Moving {action} at speed {speed} for {seconds}s...")
            angle_rad = math.radians(self.heading)
            self.position[0] += distance * math.sin(angle_rad)
            self.position[1] += distance * math.cos(angle_rad)
            self.total_distance += abs(distance)
            time.sleep(seconds)
            print(f"  Position: ({self.position[0]:.1f}, {self.position[1]:.1f})")
            _emit(
                "car_moved",
                direction=action,
                speed=speed,
                duration=seconds,
                distance=round(distance, 1),
                position=self.get_position(),
                heading=self.get_heading(),
            )
        else:  # left / right
            degrees = speed / 100.0 * DEGREES_PER_SECOND_AT_SPEED_100 * seconds
            turn = -degrees if action == "left" else degrees
            print(f"Turning {action} at speed {speed} for {seconds}s...")
            self.heading = (self.heading + turn) % 360
            time.sleep(seconds)
            print(f"  New heading: {self.heading:.1f}°")
            _emit(
                "car_turned",
                direction=action,
                speed=speed,
                duration=seconds,
                degrees=round(degrees, 1),
                position=self.get_position(),
                heading=self.get_heading(),
            )

    def stop(self):
        """Cancel any primed motion without running it."""
        self._pending = None
        print("Stopped")
        _emit("stopped", position=self.get_position(), heading=self.get_heading())

    def sensor(self, direction="front"):
        """Return the distance reading (in units) for the given sensor direction."""
        valid_directions = ("front", "right", "back", "left")
        if direction not in valid_directions:
            raise ValueError(
                f"Invalid sensor direction: {direction}. Use: {list(valid_directions)}"
            )

        reading = round(max(0.1, self.sensor_range + random.uniform(-0.2, 0.2)), 1)
        _emit("sensor_read", direction=direction, value=reading)
        return reading

    def distance(self):
        """Return the total distance travelled so far."""
        return round(self.total_distance, 1)

    def get_position(self):
        """Return the current (x, y) position."""
        return (round(self.position[0], 1), round(self.position[1], 1))

    def get_heading(self):
        """Return the current heading in degrees."""
        return round(self.heading, 1)

    def status(self):
        """Return a snapshot of the car's current state."""
        state = {
            "position": self.get_position(),
            "heading": self.get_heading(),
            "distance": self.distance(),
        }
        _emit("status", **state)
        return state

    def reset(self):
        """Reset the car to its initial state."""
        self.position = [0.0, 0.0]
        self.heading = 0.0
        self.total_distance = 0.0
        self._pending = None
        print("Car reset to initial state")
        _emit("reset", position=self.get_position(), heading=self.get_heading())
