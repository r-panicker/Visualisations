/**
 * Simple C program to illustrate multithreading using POSIX threads (pthreads)
 * 
 * This program creates multiple threads that execute concurrently,
 * each printing its thread ID and a message.
 * 
 * Compile with: gcc -pthread multithreading_example.c -o multithreading_example
 * Run with: ./multithreading_example
 */

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <unistd.h>

#define NUM_THREADS 5

// Structure to pass data to threads
typedef struct {
    int thread_id;
    char *message;
} thread_data_t;

// Thread function - this is what each thread will execute
void *thread_function(void *arg) {
    thread_data_t *data = (thread_data_t *)arg;
    
    printf("Thread %d: Starting - %s\n", data->thread_id, data->message);
    
    // Simulate some work with a short sleep
    sleep(1);
    
    printf("Thread %d: Finished work\n", data->thread_id);
    
    // Return a value (optional)
    pthread_exit(NULL);
}

int main() {
    pthread_t threads[NUM_THREADS];
    thread_data_t thread_data[NUM_THREADS];
    int ret;
    int i;
    
    printf("Main: Starting multithreading example...\n\n");
    
    // Create threads
    for (i = 0; i < NUM_THREADS; i++) {
        // Prepare data for this thread
        thread_data[i].thread_id = i + 1;
        thread_data[i].message = "Hello from thread";
        
        printf("Main: Creating thread %d\n", i + 1);
        
        // Create the thread
        ret = pthread_create(&threads[i], NULL, thread_function, (void *)&thread_data[i]);
        
        if (ret != 0) {
            fprintf(stderr, "ERROR: Failed to create thread %d (error code: %d)\n", i + 1, ret);
            exit(EXIT_FAILURE);
        }
    }
    
    printf("\nMain: All threads created, waiting for them to complete...\n\n");
    
    // Wait for all threads to complete (join them)
    for (i = 0; i < NUM_THREADS; i++) {
        ret = pthread_join(threads[i], NULL);
        
        if (ret != 0) {
            fprintf(stderr, "ERROR: Failed to join thread %d (error code: %d)\n", i + 1, ret);
            exit(EXIT_FAILURE);
        }
        
        printf("Main: Thread %d joined successfully\n", i + 1);
    }
    
    printf("\nMain: All threads completed. Exiting program.\n");
    
    return 0;
}