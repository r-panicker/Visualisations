# Simple Multithreading Example in C

This is a simple C program that demonstrates multithreading using POSIX threads (pthreads).

## Overview

The program creates 5 threads that run concurrently. Each thread:
1. Receives a unique ID and message
2. Prints a starting message
3. Simulates work by sleeping for 1 second
4. Prints a completion message
5. Exits gracefully

The main thread waits for all threads to complete using `pthread_join()`.

## Files

- `multithreading_example.c` - The main C source file

## Prerequisites

- GCC compiler (or another C compiler that supports pthreads)
- POSIX threads library (usually included with most Linux/Unix systems)

On Debian/Ubuntu systems, install the required packages with:
```bash
sudo apt-get update
sudo apt-get install build-essential
```

## Compilation

Compile the program using GCC with the `-pthread` flag:

```bash
gcc -pthread multithreading_example.c -o multithreading_example
```

The `-pthread` flag:
- Links the pthread library
- Defines necessary preprocessor macros
- Ensures proper thread support

## Execution

Run the compiled program:

```bash
./multithreading_example
```

## Expected Output

The output will show threads executing concurrently. You'll see messages like:

```
Main: Starting multithreading example...

Main: Creating thread 1
Main: Creating thread 2
Main: Creating thread 3
Main: Creating thread 4
Main: Creating thread 5

Main: All threads created, waiting for them to complete...

Thread 1: Starting - Hello from thread
Thread 2: Starting - Hello from thread
Thread 3: Starting - Hello from thread
Thread 4: Starting - Hello from thread
Thread 5: Starting - Hello from thread
Thread 1: Finished work
Thread 2: Finished work
Thread 3: Finished work
Thread 4: Finished work
Thread 5: Finished work
Main: Thread 1 joined successfully
Main: Thread 2 joined successfully
Main: Thread 3 joined successfully
Main: Thread 4 joined successfully
Main: Thread 5 joined successfully

Main: All threads completed. Exiting program.
```

Note: The exact order of thread execution may vary between runs due to the nature of concurrent execution.

## Key Concepts Demonstrated

1. **Thread Creation**: Using `pthread_create()` to spawn new threads
2. **Thread Function**: Each thread executes the `thread_function`
3. **Data Passing**: Passing data to threads via structures
4. **Thread Synchronization**: Using `pthread_join()` to wait for threads
5. **Concurrent Execution**: Multiple threads running simultaneously

## Thread Safety Notes

This example is designed to be simple and educational. In real-world applications, you would need to consider:

- **Race Conditions**: Multiple threads accessing shared data
- **Mutexes**: Using `pthread_mutex_t` to protect shared resources
- **Condition Variables**: Using `pthread_cond_t` for thread communication
- **Thread-local Storage**: Data that's local to each thread

## Extending the Example

To modify the number of threads, change the `NUM_THREADS` macro at the top of the file:

```c
#define NUM_THREADS 10  // Create 10 threads instead of 5
```

## License

This is an educational example and is free to use.