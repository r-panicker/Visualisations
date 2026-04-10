/**
 * Simple Race Condition Demonstration for Operating Systems Lecture
 * 
 * Scenario: Two threads deposit money into a shared bank account.
 * Each thread reads the balance, adds $100, and writes it back.
 * 
 * Expected final balance: $200
 * Actual balance (with race condition): Often $100 (one deposit lost!)
 * 
 * Compile: gcc -pthread race_condition_example.c -o race_condition_example
 * Run:     ./race_condition_example
 */

#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

// Shared "bank account" balance
int balance = 0;

// Simulate the time it takes to process a transaction
void process_transaction() {
    // This delay makes the race condition visible
    usleep(10000);  // 10ms - like the bank system "thinking"
}

// Thread function: Deposit $100 into the account
void *deposit(void *arg) {
    int thread_id = *((int *)arg);
    
    printf("  [Thread %d] Reading balance: $%d\n", thread_id, balance);
    
    // --- RACE CONDITION HAPPENS HERE ---
    // Both threads can read the same value before either writes back!
    int current_balance = balance;      // Step 1: Read
    process_transaction();              // Step 2: "Process" (delay)
    int new_balance = current_balance + 100;  // Step 3: Calculate
    balance = new_balance;              // Step 4: Write back
    // ------------------------------------
    
    printf("  [Thread %d] Deposited $100. New balance: $%d\n", thread_id, balance);
    
    return NULL;
}

int main() {
    pthread_t t1, t2;
    int id1 = 1, id2 = 2;
    
    printf("=== Race Condition Demo: Bank Account ===\n\n");
    printf("Scenario: Two people each deposit $100 into a shared account.\n");
    printf("Expected final balance: $200\n");
    printf("Starting balance: $%d\n\n", balance);
    
    printf("Executing deposits simultaneously...\n");
    
    // Create two threads that will both try to deposit
    pthread_create(&t1, NULL, deposit, &id1);
    pthread_create(&t2, NULL, deposit, &id2);
    
    // Wait for both to finish
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    
    printf("\nFinal balance: $%d\n", balance);
    
    if (balance < 200) {
        printf("\n*** RACE CONDITION! Lost $%d ***\n", 200 - balance);
        printf("Both threads read $0, added $100, and wrote $100.\n");
        printf("One deposit was lost because they didn't synchronize!\n");
    } else {
        printf("\n(No race condition this time - try running again)\n");
    }
    
    printf("\n--- Now with Mutex (Correct Approach) ---\n\n");
    
    // Reset and demonstrate the fix
    balance = 0;
    pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;
    
    // We'll use a simple inline approach to show the fix
    printf("With mutex, only one thread can access the account at a time.\n");
    printf("This ensures no deposits are lost.\n\n");
    
    // For simplicity, just show the concept - in practice you'd create
    // threads again but with mutex locking around the critical section
    pthread_mutex_lock(&lock);
    int temp = balance;
    process_transaction();
    balance = temp + 100;
    printf("  [Thread 1] Deposited $100. Balance: $%d\n", balance);
    pthread_mutex_unlock(&lock);
    
    pthread_mutex_lock(&lock);
    temp = balance;
    process_transaction();
    balance = temp + 100;
    printf("  [Thread 2] Deposited $100. Balance: $%d\n", balance);
    pthread_mutex_unlock(&lock);
    
    printf("\nFinal balance with mutex: $%d (correct!)\n", balance);
    
    pthread_mutex_destroy(&lock);
    
    printf("\n=== Key Takeaway ===\n");
    printf("Without synchronization, concurrent access to shared data\n");
    printf("can lead to lost updates. Use mutexes to protect critical sections.\n");
    
    return 0;
}